import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from app.domains.chatbot.infrastructure.postgres_repository import _get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

class ProcedureUpdate(BaseModel):
    name: str
    description: str | None = None
    amount: float | None = None
    currency: str | None = None
    is_active: int

@router.get("/procedures")
def get_procedures():
    """Retorna la lista de trámites para el panel de administración."""
    conn = _get_connection()
    try:
        import psycopg2.extras
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("SELECT id, code, name, description, amount, currency, is_active FROM procedure ORDER BY id ASC")
        rows = cursor.fetchall()
        cursor.close()
        return rows
    except Exception as e:
        logger.error(f"Error fetching procedures: {e}")
        raise HTTPException(status_code=500, detail="Error fetching procedures")
    finally:
        from app.domains.chatbot.infrastructure.postgres_repository import _release_connection
        _release_connection(conn)

@router.put("/procedures/{code}")
def update_procedure(code: str, data: ProcedureUpdate):
    """Actualiza un trámite específico."""
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE procedure 
            SET name = %s, description = %s, amount = %s, currency = %s, is_active = %s
            WHERE code = %s
            """,
            (data.name, data.description, data.amount, data.currency, data.is_active, code)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Trámite no encontrado")
        cursor.close()
        return {"success": True, "message": "Trámite actualizado correctamente."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating procedure {code}: {e}")
        raise HTTPException(status_code=500, detail="Error updating procedure")
    finally:
        from app.domains.chatbot.infrastructure.postgres_repository import _release_connection
        _release_connection(conn)
