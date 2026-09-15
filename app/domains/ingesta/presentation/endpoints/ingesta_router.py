"""
Router del endpoint /api/ingestar – Ingesta Automatizada de Normativas.

Pipeline completo:
1. Recibe imagen escaneada de normativa legal.
2. Extrae texto con OCR (Tesseract).
3. Estructura el texto en JSON con LLM (Gemma 4).
4. Valida con Pydantic y actualiza PostgreSQL + ChromaDB.
"""

import logging

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import ValidationError

from app.domains.ingesta.presentation.schemas.ingesta_schemas import (
    NuevoTramiteSchema,
    IngestaResponseSchema,
)
from app.domains.ingesta.application.ocr_extractor import extraer_texto_ocr
from app.domains.ingesta.application.llm_structurer import estructurar_texto_a_json
from app.domains.ingesta.infrastructure.ingesta_repository import (
    insertar_tramite_postgres,
    indexar_tramite_chromadb,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ingesta"])


@router.post(
    "/ingestar",
    response_model=IngestaResponseSchema,
    summary="Ingestar normativa escaneada con OCR",
    description=(
        "Recibe la imagen de una normativa catastral escaneada, "
        "extrae el texto con OCR (Tesseract), lo estructura con Gemma 4 "
        "y actualiza PostgreSQL y ChromaDB simultáneamente."
    ),
)
async def ingestar_normativa(
    archivo: UploadFile = File(
        ...,
        description="Imagen escaneada de la normativa legal (PNG, JPG, TIFF, etc.).",
    ),
) -> IngestaResponseSchema:
    """
    Endpoint principal de ingesta automatizada.
    """

    # ETAPA 1: Leer la imagen subida
    try:
        contenido_imagen = await archivo.read()
        if not contenido_imagen:
            raise ValueError("El archivo subido está vacío.")
        logger.info("Imagen recibida: '%s' – %d bytes.", archivo.filename, len(contenido_imagen))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        logger.error("Error al leer la imagen subida.", exc_info=True)
        raise HTTPException(status_code=500, detail=f"[ETAPA 1] Error inesperado: {exc}")

    # ETAPA 2: Extracción de texto con OCR (Tesseract)
    try:
        texto_crudo = await extraer_texto_ocr(contenido_imagen)
    except Exception as exc:
        logger.error("Fallo en la extracción OCR.", exc_info=True)
        raise HTTPException(status_code=500, detail=f"[ETAPA 2 – Extracción OCR] No se pudo extraer el texto de la imagen. Detalle: {exc}")

    # ETAPA 3: Estructuración JSON con LLM (Gemma 4)
    try:
        json_crudo = await estructurar_texto_a_json(texto_crudo)
        tramite_validado = NuevoTramiteSchema.model_validate_json(json_crudo)
    except ValidationError as ve:
        logger.error("Gemma 4 produjo un JSON inválido.", exc_info=True)
        raise HTTPException(status_code=500, detail=f"[ETAPA 3 – Estructuración LLM] JSON inválido. Detalle: {ve.errors()}")
    except Exception as exc:
        logger.error("Fallo en la estructuración LLM.", exc_info=True)
        raise HTTPException(status_code=500, detail=f"[ETAPA 3 – Estructuración LLM] Fallo. Detalle: {exc}")

    # ETAPA 4: Base de Datos y ChromaDB
    db_insertado = False
    vector_indexado = False

    try:
        await insertar_tramite_postgres(tramite_validado)
        db_insertado = True
    except Exception as exc:
        logger.error("Fallo en PostgreSQL.", exc_info=True)
        raise HTTPException(status_code=500, detail=f"[ETAPA 4a – DB] {exc}")

    try:
        await indexar_tramite_chromadb(tramite_validado)
        vector_indexado = True
    except Exception as exc:
        logger.error("Fallo en ChromaDB.", exc_info=True)
        raise HTTPException(status_code=500, detail=f"[ETAPA 4b – ChromaDB] {exc}")

    return IngestaResponseSchema(
        success=True,
        message=f"Trámite '{tramite_validado.nombre_tramite}' ingestada exitosamente vía OCR.",
        tramite=tramite_validado,
        db_insertado=db_insertado,
        vector_indexado=vector_indexado,
    )
