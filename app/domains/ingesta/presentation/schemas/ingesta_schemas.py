"""
Esquemas Pydantic para el módulo de Ingesta Automatizada.

Define la estructura de validación estricta para los datos extraídos
de normativas escaneadas mediante el pipeline VLM → LLM.
"""

from typing import Any
from pydantic import BaseModel, Field, field_validator


class NuevoTramiteSchema(BaseModel):
    """
    Esquema estricto para la estructura JSON que Gemma 4 debe producir
    al analizar el texto crudo extraído por el VLM.

    Campos:
        nombre_tramite: Nombre oficial del trámite catastral.
        requisitos:     Lista exhaustiva de documentos/requisitos.
        costo:          Costo del trámite en formato textual (ej. "Bs. 50").
    """
    nombre_tramite: str = Field(
        ...,
        min_length=1,
        description="Nombre oficial del trámite catastral.",
    )
    requisitos: list[Any] = Field(
        ...,
        min_length=1,
        description="Lista de requisitos documentales del trámite.",
    )
    costo: str = Field(
        "",
        description="Costo del trámite (ej. 'Bs. 50', 'Gratuito'). Puede estar vacío.",
    )

    @field_validator('requisitos')
    @classmethod
    def stringify_requisitos(cls, v):
        # Si Gemma generó objetos o diccionarios, convertirlos a string
        return [str(req) if not isinstance(req, str) else req for req in v]


class IngestaResponseSchema(BaseModel):
    """Respuesta del endpoint de ingesta cuando el pipeline completa con éxito."""
    success: bool = True
    message: str
    tramite: NuevoTramiteSchema
    db_insertado: bool = Field(
        ..., description="Indica si el registro fue insertado en PostgreSQL."
    )
    vector_indexado: bool = Field(
        ..., description="Indica si el documento fue añadido a ChromaDB."
    )
