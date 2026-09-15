from typing import Literal

from pydantic import BaseModel, Field

class MessageSchema(BaseModel):
    role: str = Field(..., examples=["user", "assistant", "system"])
    content: str

class ChatRequestSchema(BaseModel):
    session_id: str = Field("default_session")
    messages: list[MessageSchema]

class ChatResponseSchema(BaseModel):
    response: str
    message_id: int | None = None

class FeedbackRequestSchema(BaseModel):
    message_id: int
    feedback: Literal["positive", "negative"]
    comment: str | None = None

class VisionRequestSchema(BaseModel):
    session_id: str = Field("default_session")
    prompt: str = Field("", description="Texto opcional del usuario acompañando la imagen")

class SearchResultSchema(BaseModel):
    procedure_code: str | None = None
    procedure_name: str | None = None
    requirements: list[str] = Field(default_factory=list)
    qr_images: list[str] = Field(default_factory=list)
    score: float = 0.0
    is_found: bool = False

class AuditResponseSchema(BaseModel):
    estado: str = Field(..., description="Audit status")
    documentos_presentes: list[str] = Field(default_factory=list)
    documentos_faltantes: list[str] = Field(default_factory=list)
    observaciones: str
