"""
Servicio de estructuración JSON – LLM vía Ollama /api/chat.

Toma el texto crudo extraído por el OCR y lo estructura en un JSON
válido siguiendo el esquema NuevoTramiteSchema, forzando salida JSON.
"""

import logging
import httpx
import os

from app.config import OLLAMA_URL

logger = logging.getLogger(__name__)

SYSTEM_PROMPT: str = (
    "Eres un analista legal. Lee este texto extraído por OCR y mapealo "
    "ESTRICTAMENTE a este JSON: {'nombre_tramite': '', 'requisitos': [], 'costo': ''}. "
    "Ignora el ruido de lectura o caracteres extraños. No incluyas explicaciones."
)

MODEL_NAME = "gemma4:e4b"

async def estructurar_texto_a_json(texto_crudo: str) -> str:
    """
    Envía el texto crudo al modelo con formato JSON forzado
    para obtener un JSON estructurado con los datos del trámite.
    """
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": texto_crudo},
        ],
        "format": "json",
        "stream": False,
    }

    logger.info(
        "Enviando texto OCR a %s para estructuración JSON – "
        "%d caracteres de entrada.",
        MODEL_NAME,
        len(texto_crudo),
    )

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        data = response.json()

    contenido_json = data.get("message", {}).get("content", "").strip()

    if not contenido_json:
        raise ValueError(
            "El LLM retornó una respuesta vacía al intentar estructurar el texto."
        )

    logger.info("Estructuración exitosa – %d caracteres de JSON.", len(contenido_json))
    return contenido_json
