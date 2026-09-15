"""
Configuración centralizada del backend.

Todas las constantes y parámetros ajustables del sistema se definen aquí
para facilitar cambios de entorno (dev/staging/prod) sin tocar la lógica.
"""

# ---------------------------------------------------------------------------
# Ollama / Modelo local
# ---------------------------------------------------------------------------
OLLAMA_URL: str = "http://localhost:11434/api/chat"
OLLAMA_GENERATE_URL: str = "http://localhost:11434/api/generate"
DEFAULT_MODEL: str = "gemma4:e4b"
VLM_MODEL: str = "qwen3-vl:4b"


# ---------------------------------------------------------------------------
# Motor de búsqueda difusa
# ---------------------------------------------------------------------------
# Umbral mínimo de similitud (0.0 – 1.0) para considerar un match válido.
# Valores más altos = coincidencia más estricta.
FUZZY_MATCH_THRESHOLD: float = 0.58

# ---------------------------------------------------------------------------
# MySQL – Base de datos catastro_gamc
# ---------------------------------------------------------------------------
MYSQL_HOST: str = "localhost"
MYSQL_PORT: int = 3306
MYSQL_USER: str = "root"
MYSQL_PASSWORD: str = "1204"
MYSQL_DATABASE: str = "catastro_gamc"

# ---------------------------------------------------------------------------
# PostgreSQL – Base de datos catastro_gamc (Opcional)
# ---------------------------------------------------------------------------
PG_HOST: str = "localhost"
PG_PORT: int = 5432
PG_USER: str = "postgres"
PG_PASSWORD: str = "8282"
PG_DATABASE: str = "catastro_gamc"
