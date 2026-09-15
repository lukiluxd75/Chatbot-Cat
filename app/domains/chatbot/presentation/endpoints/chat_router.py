"""
Router del endpoint principal /api/chat.

Orquesta el flujo RAG completo con persistencia de estado de sesión.
"""

import base64
import logging

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from pydantic import ValidationError

from app.config import DEFAULT_MODEL, VLM_MODEL, OLLAMA_URL
from app.domains.chatbot.presentation.schemas.chat_schemas import ChatRequestSchema as ChatRequest, ChatResponseSchema as ChatResponse, AuditResponseSchema as AuditoriaResponse, SearchResultSchema as SearchResult, FeedbackRequestSchema
from app.domains.chatbot.application.prompt_builder import ensamblar_system_prompt
from app.domains.chatbot.application.vector_search import buscar_tramite
from app.domains.chatbot.infrastructure.postgres_repository import obtener_ultimo_tramite_sesion, obtener_tramite, guardar_mensaje_historial, guardar_feedback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    
    session_id = request.session_id
    
    # 1. Extraer el último mensaje del usuario
    ultimo_mensaje_usuario = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            ultimo_mensaje_usuario = msg.content
            break

    if not ultimo_mensaje_usuario:
        raise HTTPException(status_code=400, detail="No hay mensaje del usuario.")

    # 2. Buscar trámite en el mensaje actual (Búsqueda Semántica)
    resultado_busqueda = await buscar_tramite(ultimo_mensaje_usuario)
    
    # 3. MEMORIA DE ESTADO: Si el usuario hizo una pregunta de seguimiento ("¿y cuánto cuesta?")
    # el buscador no encontrará trámite. En ese caso, miramos de qué hablaba antes en esta sesión.
    if not resultado_busqueda.is_found:
        ultimo_clave = await obtener_ultimo_tramite_sesion(session_id)
        if ultimo_clave:
            # Recuperar datos de ese trámite de la base de datos
            datos_tramite = await obtener_tramite(ultimo_clave)
            if datos_tramite:
                logger.info(f"Sesión {session_id} - Usando memoria de estado: {ultimo_clave}")
                resultado_busqueda = SearchResult(
                    procedure_code=ultimo_clave,
                    procedure_name=datos_tramite["name"],
                    requirements=datos_tramite["procedure_requirement"],
                    qr_images=datos_tramite.get("qr_images", []),
                    score=1.0, # Match heredado
                    is_found=True
                )

    logger.info(
        "Búsqueda final: '%s' → %s (score: %.4f)",
        ultimo_mensaje_usuario,
        resultado_busqueda.procedure_name or "SIN MATCH",
        resultado_busqueda.score,
    )

    # 4. Guardar en el historial de la base de datos (lo que dijo el usuario)
    await guardar_mensaje_historial(
        session_id=session_id,
        role="user",
        content=ultimo_mensaje_usuario,
        detected_procedure=resultado_busqueda.procedure_code,
        match_score=resultado_busqueda.score,
        is_unanswered=not resultado_busqueda.is_found
    )

    # 5. Ensamblar el system prompt con TODOS los datos enriquecidos
    system_prompt = await ensamblar_system_prompt(resultado_busqueda)

    # 6. Construir payload
    messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    payload = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "stream": False
    }

    # 7. Llamar a Ollama
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            bot_reply = data["message"]["content"]
            
            # Intentar validar que la respuesta es un JSON válido que cumple con el esquema AuditoriaResponse
            bot_reply_final = bot_reply
            try:
                auditoria_data = AuditoriaResponse.model_validate_json(bot_reply)
                bot_reply_final = auditoria_data.model_dump_json()
            except ValidationError:
                # Si falla la validación Pydantic, asumimos que es una respuesta en texto (Markdown)
                pass
            except Exception:
                pass
            
            # 8. Guardar la respuesta de la IA en el historial
            assistant_msg_id = await guardar_mensaje_historial(
                session_id=session_id,
                role="assistant",
                content=bot_reply_final,
                detected_procedure=resultado_busqueda.procedure_code
            )
            
            return ChatResponse(response=bot_reply_final, message_id=assistant_msg_id)
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="El modelo local no respondió a tiempo.")
    except Exception as exc:
        logger.error(f"Error de Ollama: {exc}")
        raise HTTPException(status_code=502, detail="Error de conexión con la IA local.")


@router.post("/feedback")
async def feedback_endpoint(request: FeedbackRequestSchema):
    """
    Recibe la retroalimentación (👍 positive / 👎 negative) del usuario
    sobre una respuesta del asistente, con un comentario opcional,
    y la guarda en la base de datos.
    """
    updated = await guardar_feedback(
        message_id=request.message_id,
        feedback=request.feedback,
        comment=request.comment,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado.")
    
    logger.info("Feedback '%s' registrado para message_id=%d", request.feedback, request.message_id)
    return {"success": True, "message": "Retroalimentación registrada correctamente."}


@router.post("/vision")
async def vision_endpoint(
    image: UploadFile = File(...),
    prompt: str = Form(""),
    session_id: str = Form("default_session"),
):
    """
    Recibe una imagen (foto de documento, plano, etc.) y un prompt opcional.
    Envía la imagen al modelo de visión qwen3-vl:4b vía Ollama para análisis.
    """
    # 1. Validar tipo de archivo
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

    # 2. Leer y convertir a base64
    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB máximo
        raise HTTPException(status_code=400, detail="La imagen es demasiado grande (máx. 20 MB).")
    
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    # 3. Construir el prompt para el modelo de visión
    user_text = prompt.strip() if prompt.strip() else "Analiza esta imagen de un documento catastral. Describe qué tipo de documento es, qué información contiene y si parece estar completo."

    # 4. Guardar el mensaje del usuario en el historial
    await guardar_mensaje_historial(
        session_id=session_id,
        role="user",
        content=f"[Imagen adjunta] {user_text}",
    )

    # 5. Llamar a Ollama con el modelo de visión
    payload = {
        "model": VLM_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Eres un asistente experto en trámites catastrales del Gobierno "
                    "Autónomo Municipal de Cochabamba (GAMC). Analiza las imágenes de "
                    "documentos que te envían los ciudadanos. Identifica el tipo de "
                    "documento, verifica si la información es legible y completa, y "
                    "brinda orientación sobre qué trámite catastral corresponde. "
                    "Responde siempre en español."
                ),
            },
            {
                "role": "user",
                "content": user_text,
                "images": [image_b64],
            },
        ],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            bot_reply = data["message"]["content"]

            # 6. Guardar la respuesta en el historial
            assistant_msg_id = await guardar_mensaje_historial(
                session_id=session_id,
                role="assistant",
                content=bot_reply,
            )

            return ChatResponse(response=bot_reply, message_id=assistant_msg_id)

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="El modelo de visión no respondió a tiempo. Las imágenes grandes pueden tardar más.",
        )
    except Exception as exc:
        logger.error(f"Error de Ollama (vision): {exc}")
        raise HTTPException(status_code=502, detail="Error de conexión con la IA de visión.")
