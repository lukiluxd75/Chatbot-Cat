"""
Schemas Pydantic para validación de request/response.

Separar los modelos permite reutilizarlos en tests y en otros routers
sin crear dependencias circulares.
"""

from pydantic import BaseModel, Field


class Message(BaseModel):
    """Un mensaje individual dentro de la conversación."""
    role: str = Field(..., examples=["user", "assistant", "system"])
    content: str


class ChatRequest(BaseModel):
    """Payload que envía el frontend al endpoint /api/chat."""
    session_id: str = Field("default_session", description="ID único de la sesión del usuario")
    messages: list[Message]


class ChatResponse(BaseModel):
    """Respuesta estandarizada que devuelve el endpoint /api/chat."""
    response: str


class SearchResult(BaseModel):
    """Resultado del motor de búsqueda de trámites."""
    tramite_key: str | None = Field(
        None, description="Clave interna del trámite encontrado"
    )
    tramite_nombre: str | None = Field(
        None, description="Nombre legible del trámite"
    )
    requisitos: list[str] = Field(
        default_factory=list,
        description="Lista estricta de requisitos documentales",
    )
    score: float = Field(
        0.0, description="Puntuación de similitud (0.0 – 1.0)"
    )
    encontrado: bool = Field(
        False, description="Indica si se halló un trámite coincidente"
    )

class AuditoriaResponse(BaseModel):
    """Respuesta estructurada para el sistema de auditoría catastral."""
    estado: str = Field(..., description="Estado de la auditoría (Ej: Aprobado, Rechazado, Pendiente)")
    documentos_presentes: list[str] = Field(default_factory=list, description="Lista de documentos encontrados")
    documentos_faltantes: list[str] = Field(default_factory=list, description="Lista de documentos faltantes")
    observaciones: str = Field(..., description="Observaciones generales de la auditoría")

