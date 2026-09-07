"""
Mock DB Estructurada – Simulación en memoria de la tabla de trámites.

Cada trámite se identifica por una clave canónica (slug) y contiene:
  - nombre:      Nombre legible para mostrar al ciudadano.
  - aliases:     Variaciones comunes con las que el ciudadano puede referirse
                 al trámite (usadas por el motor de búsqueda difusa).
  - requisitos:  Lista estricta y exhaustiva de requisitos documentales.
  - descripcion: Breve explicación del trámite.
  - costo:       Costo aproximado del trámite (referencial).
  - tiempo_estimado: Tiempo estimado de procesamiento.

───────────────────────────────────────────────────────────────────────
NOTA DE MIGRACIÓN:
  Cuando la base de datos SQL esté lista, crea un módulo `app/db/sql_db.py`
  que implemente la función `obtener_tramites() -> dict` con la misma
  estructura de retorno, y actualiza la importación en
  `app/services/search.py`.  El resto del código no necesita cambios.
───────────────────────────────────────────────────────────────────────
"""

from typing import Any

# ---------------------------------------------------------------------------
# Base de datos en memoria
# ---------------------------------------------------------------------------
TRAMITES_DB: dict[str, dict[str, Any]] = {
    "cambio_de_nombre": {
        "nombre": "Cambio de Nombre de Propietario",
        "aliases": [
            "cambio de nombre",
            "transferencia de propiedad",
            "cambio de titular",
            "traspaso de propiedad",
            "cambio de propietario",
            "cambio de dueño",
        ],
        "requisitos": [
            "Fotocopia de Cédula de Identidad del nuevo propietario (vigente)",
            "Fotocopia de Cédula de Identidad del anterior propietario (vigente)",
            "Testimonio de Transferencia (Escritura Pública registrada en Derechos Reales)",
            "Folio Real actualizado (emitido por Derechos Reales, vigencia máx. 90 días)",
            "Certificado Catastral del inmueble (vigente)",
            "Último comprobante de pago del Impuesto a la Propiedad de Bienes Inmuebles",
            "Formulario de solicitud de cambio de nombre (proporcionado en ventanilla)",
        ],
        "descripcion": (
            "Trámite para actualizar el registro catastral cuando un inmueble "
            "cambia de propietario, ya sea por compra-venta, donación, "
            "sucesión hereditaria u otro acto jurídico válido."
        ),
        "costo": "Bs. 50 (sujeto a actualización)",
        "tiempo_estimado": "5 a 10 días hábiles",
    },
    "visado_de_plano": {
        "nombre": "Visado de Plano",
        "aliases": [
            "visado de plano",
            "visación de planos",
            "aprobación de plano",
            "visar plano",
            "visa de plano",
            "visado",
            "revision de plano",
            "revisión de planos",
        ],
        "requisitos": [
            "Plano de lote a escala 1:200 firmado por profesional habilitado (arquitecto o ing. civil)",
            "Plano de ubicación georeferenciado",
            "Fotocopia de Cédula de Identidad del propietario (vigente)",
            "Testimonio de Propiedad o Título de Adjudicación",
            "Folio Real actualizado (emitido por Derechos Reales, vigencia máx. 90 días)",
            "Certificado de Registro Catastral vigente",
            "Último comprobante de pago del Impuesto a la Propiedad de Bienes Inmuebles",
            "Formulario de solicitud de visado de plano (proporcionado en ventanilla)",
        ],
        "descripcion": (
            "Trámite mediante el cual la Dirección de Catastro revisa y aprueba "
            "el plano de un lote o propiedad, verificando que cumpla con la "
            "normativa urbanística vigente."
        ),
        "costo": "Bs. 80 (sujeto a actualización)",
        "tiempo_estimado": "10 a 15 días hábiles",
    },
    "certificado_catastral": {
        "nombre": "Certificado Catastral",
        "aliases": [
            "certificado catastral",
            "certificado de catastro",
            "certificación catastral",
            "constancia catastral",
        ],
        "requisitos": [
            "Fotocopia de Cédula de Identidad del propietario (vigente)",
            "Folio Real actualizado (emitido por Derechos Reales, vigencia máx. 90 días)",
            "Testimonio de Propiedad o documento equivalente",
            "Último comprobante de pago del Impuesto a la Propiedad de Bienes Inmuebles",
            "Formulario de solicitud de certificado catastral (proporcionado en ventanilla)",
        ],
        "descripcion": (
            "Documento oficial emitido por la Dirección de Catastro que certifica "
            "los datos registrales de un inmueble: superficie, ubicación, código "
            "catastral y propietario registrado."
        ),
        "costo": "Bs. 30 (sujeto a actualización)",
        "tiempo_estimado": "3 a 5 días hábiles",
    },
    "avaluo_catastral": {
        "nombre": "Avalúo Catastral",
        "aliases": [
            "avalúo catastral",
            "avaluo catastral",
            "avalúo de propiedad",
            "valuación catastral",
            "valor catastral",
            "avalúo de inmueble",
            "avaluo fiscal",
        ],
        "requisitos": [
            "Solicitud escrita dirigida al Director de Catastro",
            "Fotocopia de Cédula de Identidad del propietario (vigente)",
            "Certificado Alodial (emitido por la Alcaldía Municipal)",
            "Folio Real actualizado (emitido por Derechos Reales, vigencia máx. 90 días)",
            "Testimonio de Propiedad o documento equivalente",
            "Plano aprobado del inmueble (con visado vigente)",
            "Último comprobante de pago del Impuesto a la Propiedad de Bienes Inmuebles",
        ],
        "descripcion": (
            "Proceso técnico de valoración que determina el valor fiscal de un "
            "inmueble para efectos tributarios y legales, realizado por un "
            "perito designado por la Dirección de Catastro."
        ),
        "costo": "Bs. 100 (sujeto a actualización según superficie)",
        "tiempo_estimado": "10 a 20 días hábiles",
    },
}


# ---------------------------------------------------------------------------
# Interfaz pública de acceso a datos
# ---------------------------------------------------------------------------
async def obtener_tramites() -> dict[str, dict[str, Any]]:
    """
    Retorna el diccionario completo de trámites.

    En la versión SQL, esta función ejecutará la consulta y mapeará
    los resultados al mismo formato dict para mantener compatibilidad
    con el motor de búsqueda.
    """
    return TRAMITES_DB


async def obtener_tramite(key: str) -> dict[str, Any] | None:
    """
    Retorna un trámite individual por su clave canónica.

    Retorna None si la clave no existe.
    """
    return TRAMITES_DB.get(key)
