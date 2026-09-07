"""
Ensamblador del System Prompt – Inyección dinámica de contexto RAG.

Genera el prompt de sistema que se envía al LLM (Gemma 4) inyectando:
- Requisitos del trámite
- Pasos de procedimiento
- FAQ relacionadas
- Casos especiales
- Contexto institucional general
"""

from app.models import SearchResult
from app.db.sql_db import (
    obtener_pasos,
    obtener_excepciones,
    obtener_faq,
    obtener_contexto_institucional
)

_SYSTEM_PROMPT_BASE = """\
Eres el Asistente Catastral Oficial del Gobierno Autónomo Municipal de Cochabamba (GAMC).

## Tu rol
- Ayudas a los ciudadanos a conocer los requisitos, documentos, costos, plazos y pasos para realizar trámites de Catastro.
- Respondes de manera amable, clara, concisa y profesional.
- Usas un lenguaje accesible, evitando tecnicismos innecesarios (o explicándolos si los usas).

## Reglas estrictas de comportamiento
1. SOLO puedes proporcionar la información contenida en la sección [CONTEXTO DEL SISTEMA] y [CONTEXTO DEL TRÁMITE].
2. Está TERMINANTEMENTE PROHIBIDO inventar, asumir, deducir o agregar requisitos, costos, plazos o pasos que NO estén explícitamente listados en el contexto.
3. Si el ciudadano pregunta por algo que NO está en el contexto, responde amablemente que no tienes esa información y sugiere acudir a la ventanilla de Catastro.
4. No respondas preguntas fuera del ámbito municipal o catastral.
5. Mantén tus respuestas breves y directas. Usa listas y viñetas para la claridad.
"""

_CONTEXTO_SIN_TRAMITE = """\
## [CONTEXTO DEL TRÁMITE]
No se ha identificado un trámite específico en la consulta del ciudadano (o el usuario hizo una pregunta general).

Responde amablemente indicando que puedes ayudar con los siguientes trámites de Catastro:
- Cambio de Nombre de Propietario
- Visado de Plano
- Certificado Catastral
- Avalúo Catastral

Pregunta al ciudadano qué trámite desea realizar.
"""


async def ensamblar_system_prompt(resultado_busqueda: SearchResult) -> str:
    """
    Construye el System Prompt completo consultando a MySQL de forma asíncrona
    para traer toda la metadata que rodea al trámite.
    """
    
    # 1. Traer información institucional general (siempre presente)
    ctx_institucional = await obtener_contexto_institucional()
    ctx_text = "\n".join([f"- **{c['titulo']}**: {c['contenido']}" for c in ctx_institucional])
    
    bloque_institucional = f"\n## [CONTEXTO DEL SISTEMA (Información General del GAMC)]\n{ctx_text}\n"

    # 2. Si no hay trámite, retornar el base + el institucional + el fallback
    if not resultado_busqueda.encontrado or not resultado_busqueda.tramite_key:
        return _SYSTEM_PROMPT_BASE + bloque_institucional + _CONTEXTO_SIN_TRAMITE

    # 3. Si HAY trámite, recolectar todo su ecosistema de datos
    clave = resultado_busqueda.tramite_key
    
    # -- Requisitos (ya vienen en el SearchResult)
    reqs_text = "\n".join(f"  {i}. {req}" for i, req in enumerate(resultado_busqueda.requisitos, start=1))
    
    # -- Pasos
    pasos = await obtener_pasos(clave)
    pasos_text = "\n".join(f"  Paso {p['numero_paso']}: {p['titulo']} - {p['descripcion']}" for p in pasos)
    if not pasos_text: pasos_text = "  (No hay pasos registrados)"

    # -- Excepciones
    excepciones = await obtener_excepciones(clave)
    exc_text = "\n".join(f"  - **Si es {e['caso']}**: {e['descripcion']}. Requisitos extra: {e['requisitos_adicionales']}" for e in excepciones)
    if not exc_text: exc_text = "  (No aplican casos especiales)"

    # -- FAQ (Solo las del trámite)
    faqs = await obtener_faq(clave)
    # Filtramos para no llenar el prompt con FAQs generales si ya tenemos el contexto institucional
    faq_text = "\n".join(f"  P: {f['pregunta']}\n  R: {f['respuesta']}" for f in faqs if f.get('categoria') != 'general')
    if not faq_text: faq_text = "  (No hay preguntas frecuentes específicas)"

    # 4. Ensamblar el bloque del trámite
    bloque_tramite = f"""
## [CONTEXTO DEL TRÁMITE]
**Trámite detectado:** {resultado_busqueda.tramite_nombre}

**1. Requisitos documentales (lista exhaustiva):**
{reqs_text}

**2. Pasos a seguir:**
{pasos_text}

**3. Casos especiales y excepciones:**
{exc_text}

**4. Preguntas Frecuentes Relacionadas:**
{faq_text}

> RECORDATORIO PARA EL LLM: Esta es la ÚNICA información que puedes dar. No inventes requisitos adicionales ni asumas horarios o costos que no estén escritos aquí.
"""

    return _SYSTEM_PROMPT_BASE + bloque_institucional + bloque_tramite
