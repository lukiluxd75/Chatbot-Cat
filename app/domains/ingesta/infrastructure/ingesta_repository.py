"""
Repositorio de ingesta – Operaciones de escritura en PostgreSQL y ChromaDB.

Proporciona funciones para insertar nuevos trámites ingestados en la base
de datos relacional y en el vectorstore, manteniendo ambos sincronizados.
"""

import logging
import re
from typing import Any

import psycopg2.extras

from app.domains.chatbot.infrastructure.postgres_repository import (
    _get_connection,
    _release_connection,
)
from app.domains.chatbot.application.vector_search import (
    collection as chroma_collection,
    obtener_embedding,
)
from app.domains.ingesta.presentation.schemas.ingesta_schemas import (
    NuevoTramiteSchema,
)

logger = logging.getLogger(__name__)


def _generar_code(nombre_tramite: str) -> str:
    """
    Genera un code canónico a partir del nombre del trámite.
    Ej: "Cambio de Nombre" → "cambio_de_nombre"
    """
    code = nombre_tramite.lower().strip()
    code = re.sub(r"[áàäâ]", "a", code)
    code = re.sub(r"[éèëê]", "e", code)
    code = re.sub(r"[íìïî]", "i", code)
    code = re.sub(r"[óòöô]", "o", code)
    code = re.sub(r"[úùüû]", "u", code)
    code = re.sub(r"[ñ]", "n", code)
    code = re.sub(r"[^a-z0-9]+", "_", code)
    code = code.strip("_")
    return code


async def insertar_tramite_postgres(tramite: NuevoTramiteSchema) -> int:
    """
    Inserta un nuevo trámite en PostgreSQL (tablas procedure y
    procedure_requirement).

    Args:
        tramite: Datos validados del trámite.

    Returns:
        ID autogenerado del trámite insertado.

    Raises:
        psycopg2.Error: Si falla la conexión o la consulta SQL.
    """
    code = _generar_code(tramite.nombre_tramite)
    conn = _get_connection()
    try:
        cursor = conn.cursor()

        # Insertar o actualizar el trámite principal
        cursor.execute(
            """
            INSERT INTO procedure (code, name, cost_note, is_active)
            VALUES (%s, %s, %s, 1)
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                cost_note = EXCLUDED.cost_note
            """,
            (code, tramite.nombre_tramite, tramite.costo),
        )

        # Obtener el ID
        cursor.execute("SELECT id FROM procedure WHERE code = %s", (code,))
        row = cursor.fetchone()
        if not row:
            raise RuntimeError(
                f"No se pudo obtener el ID del trámite '{code}' tras la inserción."
            )
        tramite_id = row[0]

        # Limpiar requisitos previos para evitar duplicados en re-ingestas
        cursor.execute(
            "DELETE FROM procedure_requirement WHERE procedure_id = %s",
            (tramite_id,),
        )

        # Insertar requisitos
        for idx, req in enumerate(tramite.requisitos):
            cursor.execute(
                """
                INSERT INTO procedure_requirement
                    (procedure_id, description, display_order, is_mandatory)
                VALUES (%s, %s, %s, 1)
                """,
                (tramite_id, req, idx),
            )

        cursor.close()
        logger.info(
            "Trámite '%s' (ID: %d) insertado en PostgreSQL con %d requisitos.",
            code,
            tramite_id,
            len(tramite.requisitos),
        )
        return tramite_id

    except Exception:
        logger.error("Error al insertar trámite en PostgreSQL.", exc_info=True)
        raise
    finally:
        _release_connection(conn)


async def indexar_tramite_chromadb(tramite: NuevoTramiteSchema) -> None:
    """
    Genera el embedding del trámite ingestado y lo añade al vectorstore
    de ChromaDB para que esté disponible de inmediato en búsquedas.

    El documento se construye concatenando nombre + requisitos + costo
    para maximizar la riqueza semántica del vector.

    Args:
        tramite: Datos validados del trámite.

    Raises:
        httpx.HTTPStatusError: Si falla la generación del embedding.
        chromadb.errors.*: Si falla la operación en ChromaDB.
    """
    code = _generar_code(tramite.nombre_tramite)

    # Construir el texto plano para el embedding
    requisitos_texto = " | ".join(tramite.requisitos)
    documento_texto = (
        f"Trámite: {tramite.nombre_tramite}. "
        f"Requisitos: {requisitos_texto}. "
        f"Costo: {tramite.costo}."
    )

    # Generar embedding con nomic-embed-text
    embedding = await obtener_embedding(documento_texto)

    doc_id = f"{code}_ingesta_0"

    # Upsert para evitar duplicados si se re-ingesta el mismo trámite
    chroma_collection.upsert(
        ids=[doc_id],
        embeddings=[embedding],
        documents=[documento_texto],
        metadatas=[{
            "tramite_key": code,
            "nombre": tramite.nombre_tramite,
            "fuente": "ingesta_ocr",
        }],
    )

    logger.info(
        "Trámite '%s' indexado en ChromaDB (doc_id: %s) – "
        "embedding de %d dimensiones.",
        code,
        doc_id,
        len(embedding),
    )
