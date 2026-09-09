"""
Router del endpoint principal /api/chat.

Orquesta el flujo RAG completo con persistencia de estado de sesión.
"""

import logging

import httpx
from fastapi import APIRouter, HTTPException

from pydantic import ValidationError

from app.config import DEFAULT_MODEL, OLLAMA_URL
from app.models import ChatRequest, ChatResponse, AuditoriaResponse, SearchResult
from app.services.prompt import ensamblar_system_prompt
from app.services.search import buscar_tramite
from app.db.sql_db import obtener_ultimo_tramite_sesion, obtener_tramite, guardar_mensaje_historial

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
    if not resultado_busqueda.encontrado:
        ultimo_clave = await obtener_ultimo_tramite_sesion(session_id)
        if ultimo_clave:
            # Recuperar datos de ese trámite de la base de datos
            datos_tramite = await obtener_tramite(ultimo_clave)
            if datos_tramite:
                logger.info(f"Sesión {session_id} - Usando memoria de estado: {ultimo_clave}")
                resultado_busqueda = SearchResult(
                    tramite_key=ultimo_clave,
                    tramite_nombre=datos_tramite["nombre"],
                    requisitos=datos_tramite["requisitos"],
                    score=1.0, # Match heredado
                    encontrado=True
                )

    logger.info(
        "Búsqueda final: '%s' → %s (score: %.4f)",
        ultimo_mensaje_usuario,
        resultado_busqueda.tramite_nombre or "SIN MATCH",
        resultado_busqueda.score,
    )

    # 4. Guardar en el historial de la base de datos (lo que dijo el usuario)
    await guardar_mensaje_historial(
        session_id=session_id,
        role="user",
        content=ultimo_mensaje_usuario,
        tramite_detectado=resultado_busqueda.tramite_key,
        score_match=resultado_busqueda.score,
        sin_respuesta=not resultado_busqueda.encontrado
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
        "stream": False,
        "format": "json"
    }

    # 7. Llamar a Ollama
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            bot_reply = data["message"]["content"]
            
            # Validar que la respuesta es un JSON válido que cumple con el esquema AuditoriaResponse
            try:
                auditoria_data = AuditoriaResponse.model_validate_json(bot_reply)
                bot_reply_final = auditoria_data.model_dump_json()
            except ValidationError as e:
                logger.error(f"Error de validación JSON: {e}")
                raise HTTPException(status_code=500, detail="El modelo no devolvió un JSON válido para auditoría.")
            
            # 8. Guardar la respuesta de la IA en el historial
            await guardar_mensaje_historial(
                session_id=session_id,
                role="assistant",
                content=bot_reply_final,
                tramite_detectado=resultado_busqueda.tramite_key
            )
            
            return ChatResponse(response=bot_reply_final)
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="El modelo local no respondió a tiempo.")
    except Exception as exc:
        logger.error(f"Error de Ollama: {exc}")
        raise HTTPException(status_code=502, detail="Error de conexión con la IA local.")
