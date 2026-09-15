"""
Ensamblador del System Prompt – Inyección dinámica de contexto RAG.

Genera el prompt de sistema que se envía al LLM (Gemma 4) inyectando:
- Requisitos del trámite
- Pasos de procedimiento
- FAQ relacionadas
- Casos especiales
- Contexto institucional general
"""

from app.domains.chatbot.presentation.schemas.chat_schemas import SearchResultSchema as SearchResult
from app.domains.chatbot.infrastructure.postgres_repository import (
    obtener_pasos,
    obtener_excepciones,
    obtener_faq,
    obtener_contexto_institucional
)

_SYSTEM_PROMPT_BASE = """\
Eres el Asistente Catastral Oficial del Gobierno Autónomo Municipal de Cochabamba (GAMC).

## Tu rol y tono
1. Escuchar la "historia" o situación del ciudadano, entender qué tiene y qué necesita.
2. Brindar información clara, guiando al usuario sobre qué trámites aplican a su caso.
3. Auditar documentos SOLO cuando el usuario esté listo para verificar los requisitos de un trámite.
4. UTILIZAR UN LENGUAJE FORMAL, INSTITUCIONAL Y MUY EDUCADO (tratar de "usted" al ciudadano) en todas tus respuestas. Evita jergas o excesiva confianza.

## Reglas de formato de respuesta
- Si estás respondiendo dudas, explicando un proceso, analizando el caso del usuario, o dando información general: RESPONDE EN TEXTO NORMAL (Markdown). ¡NO USES JSON!
- Si respondes a la opción "Contacto", proporciona números telefónicos de contacto de Catastro GAMC (ej. 4255319, 4255320, o línea de atención 151) y la dirección de las oficinas.
- SOLO si el usuario está presentando explícitamente sus documentos para ser evaluados contra los requisitos de un trámite específico, DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO (sin usar bloques Markdown ```json), con la siguiente estructura:
{
  "estado": "Aprobado" o "Rechazado" o "Pendiente",
  "documentos_presentes": ["lista de documentos que el usuario mencionó tener"],
  "documentos_faltantes": ["lista de documentos requeridos que el usuario NO mencionó"],
  "observaciones": "Mensaje formal indicando qué falta, pasos a seguir o si está todo correcto."
}
"""

_CONTEXTO_SIN_TRAMITE = """\
## [CONTEXTO DEL TRÁMITE]
No se ha identificado un trámite específico para auditar documentos en este momento, o el usuario está haciendo una consulta general.

Como no hay un trámite específico que auditar:
- RESPONDE EN TEXTO NORMAL (Markdown), NO en JSON.
- Analiza la historia o situación que plantea el usuario y oriéntalo amablemente sobre los pasos a seguir.
- Si pregunta "¿Qué puedes hacer?", explica que puedes guiarlo en sus trámites catastrales, evaluar su situación legal/documental, auditar sus requisitos y resolver sus dudas.
- Si pregunta "¿Qué áreas abarcas?", indica que abarcas todos los trámites de Catastro (Certificados Catastrales, Visación de Planos, Avalúos, Cambios de Nombre, etc.) en el municipio de Cochabamba.
- Si pregunta por "Contacto", brinda los números de atención de Catastro y la dirección de las oficinas.
"""


async def ensamblar_system_prompt(resultado_busqueda: SearchResult) -> str:
    """
    Construye el System Prompt completo consultando a MySQL de forma asíncrona
    para traer toda la metadata que rodea al trámite.
    """
    
    # 1. Traer información institucional general (siempre presente)
    ctx_institucional = await obtener_contexto_institucional()
    ctx_text = "\n".join([f"- **{c['title']}**: {c['content']}" for c in ctx_institucional])
    
    bloque_institucional = f"\n## [CONTEXTO DEL SISTEMA (Información General del GAMC)]\n{ctx_text}\n"

    # 2. Si no hay trámite, retornar el base + el institucional + el fallback
    if not resultado_busqueda.is_found or not resultado_busqueda.procedure_code:
        return _SYSTEM_PROMPT_BASE + bloque_institucional + _CONTEXTO_SIN_TRAMITE

    # 3. Si HAY trámite, recolectar todo su ecosistema de datos
    clave = resultado_busqueda.procedure_code
    
    # -- Requisitos (ya vienen en el SearchResult)
    reqs_text = "\n".join(f"  {i}. {req}" for i, req in enumerate(resultado_busqueda.requirements, start=1))
    
    # -- Pasos
    pasos = await obtener_pasos(clave)
    pasos_text = "\n".join(f"  Paso {p['step_number']}: {p['title']} - {p['description']}" for p in pasos)
    if not pasos_text: pasos_text = "  (No hay pasos registrados)"

    # -- Excepciones
    excepciones = await obtener_excepciones(clave)
    exc_text = "\n".join(f"  - **Si es {e['case_name']}**: {e['description']}. Requisitos extra: {e['additional_requirements']}" for e in excepciones)
    if not exc_text: exc_text = "  (No aplican casos especiales)"

    # -- FAQ (Solo las del trámite)
    faqs = await obtener_faq(clave)
    # Filtramos para no llenar el prompt con FAQs generales si ya tenemos el contexto institucional
    faq_text = "\n".join(f"  P: {f['question']}\n  R: {f['answer']}" for f in faqs if f.get('category') != 'general')
    if not faq_text: faq_text = "  (No hay preguntas frecuentes específicas)"

    import urllib.parse
    # -- QR Images
    qr_text = ""
    if hasattr(resultado_busqueda, 'qr_images') and resultado_busqueda.qr_images:
        qr_text = "**5. Formularios QR Asociados al Trámite:**\n"
        qr_text += "ATENCIÓN LLM: DEBES incluir los siguientes códigos QR en tu respuesta explicando al usuario que estos son FORMULARIOS que debe descargar, escanear o llenar. Usa la sintaxis Markdown exactamente como se muestra a continuación:\n"
        for i, qr in enumerate(resultado_busqueda.qr_images, start=1):
            # Codificar espacios en la URL para evitar problemas con Markdown
            encoded_qr = urllib.parse.quote(qr)
            qr_text += f"![Formulario QR {i}]({encoded_qr})\n"
    else:
        qr_text = "**5. Formularios QR Asociados al Trámite:**\n  (No hay formularios QR disponibles)"

    # 4. Ensamblar el bloque del trámite
    costo_text = f"**Costo:** {resultado_busqueda.cost}" if resultado_busqueda.cost else "**Costo:** No especificado en la base de datos."
    tiempo_text = f"**Tiempo estimado:** {resultado_busqueda.estimated_time}" if resultado_busqueda.estimated_time else "**Tiempo estimado:** No especificado."

    bloque_tramite = f"""
## [CONTEXTO DEL TRÁMITE]
**Trámite detectado:** {resultado_busqueda.procedure_name}
{costo_text}
{tiempo_text}

**1. Requisitos documentales (lista exhaustiva):**
{reqs_text}

**2. Pasos a seguir:**
{pasos_text}

**3. Casos especiales y excepciones:**
{exc_text}

**4. Preguntas Frecuentes Relacionadas:**
{faq_text}

{qr_text}

> RECORDATORIO PARA EL LLM: Esta es la ÚNICA información que puedes dar. No inventes requisitos adicionales ni asumas horarios o costos que no estén escritos aquí. Si te preguntan por costos, usa estrictamente el Costo provisto arriba. Si hay Formularios QR asociados, es tu OBLIGACIÓN mostrarlos en la respuesta e indicarle al ciudadano que debe escanearlos para llenar los formularios correspondientes.
"""

    return _SYSTEM_PROMPT_BASE + bloque_institucional + bloque_tramite
