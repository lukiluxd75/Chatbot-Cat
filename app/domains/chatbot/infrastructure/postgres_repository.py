"""
Conexión MySQL – Capa de datos para la base de datos catastro_gamc.

Reemplaza la mock_db.py proporcionando las mismas funciones públicas
(`obtener_tramites`, `obtener_tramite`) pero consultando MySQL.

La interfaz se mantiene idéntica para que el motor de búsqueda
(`app/services/search.py`) y el resto del sistema no requieran cambios.
"""

import logging
from typing import Any

import psycopg2
from psycopg2 import pool
import psycopg2.extras

from app.config import (
    PG_HOST,
    PG_PORT,
    PG_USER,
    PG_PASSWORD,
    PG_DATABASE,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pool de conexiones (reutiliza conexiones en vez de abrir/cerrar cada vez)
# ---------------------------------------------------------------------------
_pool: pool.SimpleConnectionPool | None = None

def _get_pool() -> pool.SimpleConnectionPool:
    """Inicializa (lazy) y retorna el pool de conexiones PostgreSQL."""
    global _pool
    if _pool is None:
        _pool = pool.SimpleConnectionPool(
            1, 5,
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASSWORD,
            database=PG_DATABASE
        )
        logger.info(
            "Pool PostgreSQL inicializado: %s@%s:%s/%s",
            PG_USER, PG_HOST, PG_PORT, PG_DATABASE,
        )
    return _pool

def _get_connection():
    """Obtiene una conexión del pool."""
    conn = _get_pool().getconn()
    conn.autocommit = True
    return conn

def _release_connection(conn):
    if _pool:
        _pool.putconn(conn)


# ---------------------------------------------------------------------------
# Interfaz pública – Compatible con mock_db.py
# ---------------------------------------------------------------------------

async def obtener_tramites() -> dict[str, dict[str, Any]]:
    """
    Retorna todos los trámites activos en el mismo formato dict
    que usaba la mock_db, para compatibilidad total con search.py.

    Formato de retorno:
    {
        "cambio_de_nombre": {
            "name": "...",
            "procedure_alias": [...],
            "procedure_requirement": [...],
            "description": "...",
            "costo": "Bs. 50 (sujeto a actualización)",
            "tiempo_estimado": "5 a 10 días hábiles",
        },
        ...
    }
    """
    conn = _get_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # 1. Obtener todos los trámites activos
        cursor.execute(
            "SELECT id, code, name, description, amount, currency, "
            "cost_note, min_days, max_days, category, "
            "legal_basis, location, requires_inspection, "
            "deliverable, qr_image "
            "FROM procedure WHERE is_active = 1"
        )
        tramites_rows = cursor.fetchall()

        result: dict[str, dict[str, Any]] = {}

        for t in tramites_rows:
            tid = t["id"]
            code = t["code"]

            # 2. Aliases
            cursor.execute(
                "SELECT alias FROM procedure_alias WHERE procedure_id = %s", (tid,)
            )
            procedure_alias = [row["alias"] for row in cursor.fetchall()]

            # 3. Requisitos (ordenados)
            cursor.execute(
                "SELECT description FROM procedure_requirement "
                "WHERE procedure_id = %s ORDER BY display_order",
                (tid,),
            )
            procedure_requirement = [row["description"] for row in cursor.fetchall()]

            # Formatear costo legible
            costo_str = ""
            if t["amount"] is not None:
                costo_str = f"{t['currency']} {t['amount']}"
                if t["cost_note"]:
                    costo_str += f" ({t['cost_note']})"
            elif t["cost_note"]:
                costo_str = t["cost_note"]
            
            # Formatear tiempo legible
            tiempo_str = ""
            if t["min_days"] and t["max_days"]:
                tiempo_str = (
                    f"{t['min_days']} a {t['max_days']} días hábiles"
                )
                
            qr_images = []
            if t["qr_image"]:
                qr_images = t["qr_image"].split("|")

            result[code] = {
                "name": t["name"],
                "procedure_alias": procedure_alias,
                "procedure_requirement": procedure_requirement,
                "description": t["description"] or "",
                "costo": costo_str,
                "tiempo_estimado": tiempo_str,
                "qr_images": qr_images,
            }

        cursor.close()
        return result

    finally:
        _release_connection(conn)


async def obtener_tramite(key: str) -> dict[str, Any] | None:
    """
    Retorna un trámite individual por su code canónica.
    Retorna None si la code no existe o no está is_active.
    """
    procedure = await obtener_tramites()
    return procedure.get(key)


# ---------------------------------------------------------------------------
# Funciones extendidas (aprovechan las tablas nuevas de MySQL)
# ---------------------------------------------------------------------------

async def obtener_requisitos_detallados(tramite_clave: str) -> list[dict[str, Any]]:
    """
    Retorna los procedure_requirement con TODOS los campos (detail, where_to_obtain,
    validity, estimated_cost, etc.) para un trámite dado.
    """
    conn = _get_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT r.description, r.detail, r.display_order, r.is_mandatory, "
            "r.type, r.where_to_obtain, r.validity, r.estimated_cost "
            "FROM procedure_requirement r "
            "JOIN procedure t ON r.procedure_id = t.id "
            "WHERE t.code = %s AND t.is_active = 1 "
            "ORDER BY r.display_order",
            (tramite_clave,),
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        _release_connection(conn)


async def obtener_pasos(tramite_clave: str) -> list[dict[str, Any]]:
    """Retorna los pasos de procedimiento ordenados de un trámite."""
    conn = _get_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT p.step_number, p.title, p.description, "
            "p.location, p.estimated_duration, p.note "
            "FROM procedure_step p "
            "JOIN procedure t ON p.procedure_id = t.id "
            "WHERE t.code = %s AND t.is_active = 1 "
            "ORDER BY p.step_number",
            (tramite_clave,),
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        _release_connection(conn)


async def obtener_faq(tramite_clave: str | None = None) -> list[dict[str, Any]]:
    """
    Retorna FAQ. Si tramite_clave es None, retorna las FAQ generales.
    Si se pasa un tramite, retorna las FAQ generales + las del trámite.
    """
    conn = _get_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if tramite_clave:
            cursor.execute(
                "SELECT f.question, f.answer, f.category "
                "FROM faq f "
                "LEFT JOIN procedure t ON f.procedure_id = t.id "
                "WHERE f.is_active = 1 AND (f.procedure_id IS NULL OR t.code = %s) "
                "ORDER BY f.display_order",
                (tramite_clave,),
            )
        else:
            cursor.execute(
                "SELECT question, answer, category "
                "FROM faq "
                "WHERE is_active = 1 AND procedure_id IS NULL "
                "ORDER BY display_order"
            )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        _release_connection(conn)


async def obtener_contexto_institucional() -> list[dict[str, Any]]:
    """Retorna toda la información institucional activa."""
    conn = _get_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT code, title, content, category "
            "FROM institutional_context "
            "WHERE is_active = 1 "
            "ORDER BY display_order"
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        _release_connection(conn)


async def obtener_glosario(term: str | None = None) -> list[dict[str, Any]]:
    """
    Retorna definiciones del glossary.
    Si term es None, retorna todos. Si se pasa un término, busca coincidencia.
    """
    conn = _get_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if term:
            cursor.execute(
                "SELECT term, definition, usage_example, where_to_obtain, "
                "estimated_cost FROM glossary "
                "WHERE term LIKE %s",
                (f"%{term}%",),
            )
        else:
            cursor.execute(
                "SELECT term, definition, usage_example, where_to_obtain, "
                "estimated_cost FROM glossary ORDER BY term"
            )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        _release_connection(conn)


async def obtener_excepciones(tramite_clave: str) -> list[dict[str, Any]]:
    """Retorna los casos especiales/excepciones de un trámite."""
    conn = _get_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT e.case_name, e.description, e.additional_requirements, e.note "
            "FROM procedure_exception e "
            "JOIN procedure t ON e.procedure_id = t.id "
            "WHERE t.code = %s",
            (tramite_clave,),
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        _release_connection(conn)


async def obtener_tramites_relacionados(tramite_clave: str) -> list[dict[str, Any]]:
    """Retorna los trámites relacionados (prerequisitos, complementarios)."""
    conn = _get_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT t2.name AS tramite_relacionado, tr.relationship_type, "
            "tr.description "
            "FROM related_procedure tr "
            "JOIN procedure t1 ON tr.source_procedure_id = t1.id "
            "JOIN procedure t2 ON tr.target_procedure_id = t2.id "
            "WHERE t1.code = %s",
            (tramite_clave,),
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        _release_connection(conn)


async def guardar_mensaje_historial(
    session_id: str,
    role: str,
    content: str,
    detected_procedure: str | None = None,
    match_score: float | None = None,
    is_unanswered: bool = False,
) -> int | None:
    """Guarda un mensaje en el historial de conversaciones y retorna el ID insertado."""
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_history "
            "(session_id, role, content, detected_procedure, match_score, is_unanswered) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (session_id, role, content, detected_procedure, match_score,
             1 if is_unanswered else 0),
        )
        row = cursor.fetchone()
        cursor.close()
        return row[0] if row else None
    finally:
        _release_connection(conn)


async def guardar_feedback(message_id: int, feedback: str, comment: str | None = None) -> bool:
    """
    Actualiza la columna feedback (y opcionalmente feedback_comment)
    de un mensaje en chat_history.
    feedback debe ser 'positive' o 'negative'.
    Retorna True si se actualizó correctamente.
    """
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE chat_history SET feedback = %s, feedback_comment = %s WHERE id = %s",
            (feedback, comment, message_id),
        )
        updated = cursor.rowcount > 0
        cursor.close()
        return updated
    finally:
        _release_connection(conn)


async def obtener_ultimo_tramite_sesion(session_id: str) -> str | None:
    """Recupera la code del último trámite detectado para una sesión."""
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT detected_procedure FROM chat_history "
            "WHERE session_id = %s AND detected_procedure IS NOT NULL "
            "ORDER BY created_at DESC LIMIT 1",
            (session_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        return row[0] if row else None
    finally:
        _release_connection(conn)

