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
Eres el Asistente Catastral Oficial del Gobierno Autónomo Municipal de Cochabamba (GAMC), especializado en auditar trámites catastrales.

## Tu rol
- Auditas los documentos que el ciudadano menciona tener, comparándolos contra los requisitos del trámite.
- Generas un dictamen estructurado en formato JSON.

## Reglas estrictas de comportamiento
1. SOLO puedes evaluar los requisitos listados en la sección [CONTEXTO DEL TRÁMITE].
2. Compara lo que el usuario dice tener con los requisitos oficiales.
3. Si faltan documentos, el estado es "Rechazado" o "Pendiente". Si tiene todo, es "Aprobado".
4. DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO, sin bloques de código Markdown (```json).
5. El objeto JSON debe tener EXACTAMENTE la siguiente estructura:
{
  "estado": "Aprobado" o "Rechazado" o "Pendiente",
  "documentos_presentes": ["lista de documentos que el usuario mencionó tener"],
  "documentos_faltantes": ["lista de documentos requeridos que el usuario NO mencionó"],
  "observaciones": "Mensaje amable indicando qué falta, pasos a seguir o si está todo correcto."
}
"""

_CONTEXTO_SIN_TRAMITE = """\
## [CONTEXTO DEL TRÁMITE]
No se ha identificado un trámite específico en la consulta del ciudadano (o el usuario hizo una pregunta general).

Al no haber un trámite detectado:
- "estado": "Pendiente"
- "documentos_presentes": []
- "documentos_faltantes": []
- "observaciones": "Responde amablemente indicando que puedes ayudar con trámites como: Cambio de Nombre, Visado de Plano, Certificado Catastral o Avalúo. Pregunta al ciudadano qué trámite desea auditar."
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
