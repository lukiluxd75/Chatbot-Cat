"""
Conexión MySQL – Capa de datos para la base de datos catastro_gamc.

Reemplaza la mock_db.py proporcionando las mismas funciones públicas
(`obtener_tramites`, `obtener_tramite`) pero consultando MySQL.

La interfaz se mantiene idéntica para que el motor de búsqueda
(`app/services/search.py`) y el resto del sistema no requieran cambios.
"""

import logging
from typing import Any

import mysql.connector
from mysql.connector import pooling

from app.config import (
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pool de conexiones (reutiliza conexiones en vez de abrir/cerrar cada vez)
# ---------------------------------------------------------------------------
_pool: pooling.MySQLConnectionPool | None = None


def _get_pool() -> pooling.MySQLConnectionPool:
    """Inicializa (lazy) y retorna el pool de conexiones MySQL."""
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="catastro_pool",
            pool_size=5,
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            charset="utf8mb4",
            collation="utf8mb4_unicode_ci",
            autocommit=True,
        )
        logger.info(
            "Pool MySQL inicializado: %s@%s:%s/%s",
            MYSQL_USER, MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE,
        )
    return _pool


def _get_connection():
    """Obtiene una conexión del pool."""
    return _get_pool().get_connection()


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
            "nombre": "...",
            "aliases": [...],
            "requisitos": [...],
            "descripcion": "...",
            "costo": "Bs. 50 (sujeto a actualización)",
            "tiempo_estimado": "5 a 10 días hábiles",
        },
        ...
    }
    """
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)

        # 1. Obtener todos los trámites activos
        cursor.execute(
            "SELECT id, clave, nombre, descripcion, costo_monto, costo_moneda, "
            "costo_nota, tiempo_min_dias, tiempo_max_dias, categoria, "
            "base_legal, donde_se_realiza, requiere_inspeccion, "
            "resultado_entregable "
            "FROM tramites WHERE activo = 1"
        )
        tramites_rows = cursor.fetchall()

        result: dict[str, dict[str, Any]] = {}

        for t in tramites_rows:
            tid = t["id"]
            clave = t["clave"]

            # 2. Aliases
            cursor.execute(
                "SELECT alias FROM aliases WHERE tramite_id = %s", (tid,)
            )
            aliases = [row["alias"] for row in cursor.fetchall()]

            # 3. Requisitos (ordenados)
            cursor.execute(
                "SELECT descripcion FROM requisitos "
                "WHERE tramite_id = %s ORDER BY orden",
                (tid,),
            )
            requisitos = [row["descripcion"] for row in cursor.fetchall()]

            # Formatear costo legible
            costo_str = ""
            if t["costo_monto"] is not None:
                costo_str = f"{t['costo_moneda']} {t['costo_monto']}"
                if t["costo_nota"]:
                    costo_str += f" ({t['costo_nota']})"
            elif t["costo_nota"]:
                costo_str = t["costo_nota"]
            
            # Formatear tiempo legible
            tiempo_str = ""
            if t["tiempo_min_dias"] and t["tiempo_max_dias"]:
                tiempo_str = (
                    f"{t['tiempo_min_dias']} a {t['tiempo_max_dias']} días hábiles"
                )

            result[clave] = {
                "nombre": t["nombre"],
                "aliases": aliases,
                "requisitos": requisitos,
                "descripcion": t["descripcion"] or "",
                "costo": costo_str,
                "tiempo_estimado": tiempo_str,
            }

        cursor.close()
        return result

    finally:
        conn.close()


async def obtener_tramite(key: str) -> dict[str, Any] | None:
    """
    Retorna un trámite individual por su clave canónica.
    Retorna None si la clave no existe o no está activo.
    """
    tramites = await obtener_tramites()
    return tramites.get(key)


# ---------------------------------------------------------------------------
# Funciones extendidas (aprovechan las tablas nuevas de MySQL)
# ---------------------------------------------------------------------------

async def obtener_requisitos_detallados(tramite_clave: str) -> list[dict[str, Any]]:
    """
    Retorna los requisitos con TODOS los campos (detalle, donde_obtener,
    vigencia, costo_aproximado, etc.) para un trámite dado.
    """
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT r.descripcion, r.detalle, r.orden, r.obligatorio, "
            "r.tipo, r.donde_obtener, r.vigencia, r.costo_aproximado "
            "FROM requisitos r "
            "JOIN tramites t ON r.tramite_id = t.id "
            "WHERE t.clave = %s AND t.activo = 1 "
            "ORDER BY r.orden",
            (tramite_clave,),
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


async def obtener_pasos(tramite_clave: str) -> list[dict[str, Any]]:
    """Retorna los pasos de procedimiento ordenados de un trámite."""
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT p.numero_paso, p.titulo, p.descripcion, "
            "p.ubicacion, p.duracion_estimada, p.nota "
            "FROM pasos_procedimiento p "
            "JOIN tramites t ON p.tramite_id = t.id "
            "WHERE t.clave = %s AND t.activo = 1 "
            "ORDER BY p.numero_paso",
            (tramite_clave,),
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


async def obtener_faq(tramite_clave: str | None = None) -> list[dict[str, Any]]:
    """
    Retorna FAQ. Si tramite_clave es None, retorna las FAQ generales.
    Si se pasa un tramite, retorna las FAQ generales + las del trámite.
    """
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        if tramite_clave:
            cursor.execute(
                "SELECT f.pregunta, f.respuesta, f.categoria "
                "FROM faq f "
                "LEFT JOIN tramites t ON f.tramite_id = t.id "
                "WHERE f.activo = 1 AND (f.tramite_id IS NULL OR t.clave = %s) "
                "ORDER BY f.orden_prioridad",
                (tramite_clave,),
            )
        else:
            cursor.execute(
                "SELECT pregunta, respuesta, categoria "
                "FROM faq "
                "WHERE activo = 1 AND tramite_id IS NULL "
                "ORDER BY orden_prioridad"
            )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


async def obtener_contexto_institucional() -> list[dict[str, Any]]:
    """Retorna toda la información institucional activa."""
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT clave, titulo, contenido, categoria "
            "FROM contexto_institucional "
            "WHERE activo = 1 "
            "ORDER BY orden"
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


async def obtener_glosario(termino: str | None = None) -> list[dict[str, Any]]:
    """
    Retorna definiciones del glosario.
    Si termino es None, retorna todos. Si se pasa un término, busca coincidencia.
    """
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        if termino:
            cursor.execute(
                "SELECT termino, definicion, ejemplo_uso, donde_obtener, "
                "costo_aproximado FROM glosario "
                "WHERE termino LIKE %s",
                (f"%{termino}%",),
            )
        else:
            cursor.execute(
                "SELECT termino, definicion, ejemplo_uso, donde_obtener, "
                "costo_aproximado FROM glosario ORDER BY termino"
            )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


async def obtener_excepciones(tramite_clave: str) -> list[dict[str, Any]]:
    """Retorna los casos especiales/excepciones de un trámite."""
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT e.caso, e.descripcion, e.requisitos_adicionales, e.nota "
            "FROM excepciones_casos_especiales e "
            "JOIN tramites t ON e.tramite_id = t.id "
            "WHERE t.clave = %s",
            (tramite_clave,),
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


async def obtener_tramites_relacionados(tramite_clave: str) -> list[dict[str, Any]]:
    """Retorna los trámites relacionados (prerequisitos, complementarios)."""
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT t2.nombre AS tramite_relacionado, tr.tipo_relacion, "
            "tr.descripcion "
            "FROM tramites_relacionados tr "
            "JOIN tramites t1 ON tr.tramite_origen_id = t1.id "
            "JOIN tramites t2 ON tr.tramite_destino_id = t2.id "
            "WHERE t1.clave = %s",
            (tramite_clave,),
        )
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


async def guardar_mensaje_historial(
    session_id: str,
    role: str,
    content: str,
    tramite_detectado: str | None = None,
    score_match: float | None = None,
    sin_respuesta: bool = False,
) -> None:
    """Guarda un mensaje en el historial de conversaciones."""
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO historial_conversaciones "
            "(session_id, role, content, tramite_detectado, score_match, sin_respuesta) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (session_id, role, content, tramite_detectado, score_match,
             1 if sin_respuesta else 0),
        )
        cursor.close()
    finally:
        conn.close()

async def obtener_ultimo_tramite_sesion(session_id: str) -> str | None:
    """Recupera la clave del último trámite detectado para una sesión."""
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT tramite_detectado FROM historial_conversaciones "
            "WHERE session_id = %s AND tramite_detectado IS NOT NULL "
            "ORDER BY timestamp DESC LIMIT 1",
            (session_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        return row[0] if row else None
    finally:
        conn.close()

