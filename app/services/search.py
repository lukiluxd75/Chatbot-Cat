"""
Motor de Búsqueda Semántico – TF-IDF con Scikit-Learn.

Analiza el texto libre del usuario y lo compara contra los nombres
y aliases de cada trámite usando vectorización TF-IDF y similitud
del coseno. Esto permite que el sistema entienda mejor la intención
incluso si las palabras no coinciden exactamente, eliminando la
limitación del "fuzzy matching" clásico.
"""

import unicodedata
from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.config import FUZZY_MATCH_THRESHOLD
from app.db.sql_db import obtener_tramites
from app.models import SearchResult


def _normalizar(texto: str) -> str:
    """Normaliza un string para comparación vectorial."""
    texto = texto.lower().strip()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = "".join(c for c in texto if c.isalnum() or c == " ")
    return texto

# Stopwords personalizadas para trámites bolivianos
_STOPWORDS = [
    "a", "al", "con", "como", "cual", "de", "del", "el", "en", "es",
    "eso", "ese", "esta", "este", "hay", "la", "las", "lo", "los",
    "me", "mi", "muy", "nos", "o", "para", "pero", "por", "que",
    "se", "si", "sin", "su", "sus", "te", "tu", "un", "una", "uno",
    "unos", "unas", "y", "ya", "yo", "soy", "quiero", "necesito",
    "hacer", "sacar", "saco", "tengo", "puedo", "debo", "hago",
    "tramite", "tramites", "cuales", "son", "los", "las",
    "alcaldia", "gamc", "cochabamba", "cocha", "municipalidad"
]

# Inicializamos el vectorizador (se entrenará con los datos de MySQL en cada petición)
_vectorizer = TfidfVectorizer(stop_words=_STOPWORDS, ngram_range=(1, 2))


async def buscar_tramite(consulta_usuario: str) -> SearchResult:
    """
    Busca el trámite más relevante usando TF-IDF y Similitud del Coseno.
    """
    consulta_norm = _normalizar(consulta_usuario)
    if not consulta_norm:
        return SearchResult(encontrado=False, score=0.0)

    tramites = await obtener_tramites()
    
    # Preparamos el corpus: cada alias es un documento, mapeado a una clave de trámite
    corpus = []
    keys_map = []
    
    for key, data in tramites.items():
        candidatos = [data["nombre"]] + data.get("aliases", [])
        for cand in candidatos:
            corpus.append(_normalizar(cand))
            keys_map.append(key)
            
    # Si la base de datos está vacía
    if not corpus:
        return SearchResult(encontrado=False, score=0.0)

    # Entrenar el modelo TF-IDF con los aliases
    # (En producción esto podría cachearse, pero para <100 aliases, es instantáneo)
    try:
        tfidf_matrix = _vectorizer.fit_transform(corpus)
    except ValueError:
        # Pasa si todo el corpus son stopwords
        return SearchResult(encontrado=False, score=0.0)

    # Vectorizar la consulta del usuario
    query_vec = _vectorizer.transform([consulta_norm])
    
    # Calcular similitudes del coseno
    similitudes = cosine_similarity(query_vec, tfidf_matrix).flatten()
    
    # Obtener el mejor match
    best_idx = similitudes.argmax()
    mejor_score = float(similitudes[best_idx])
    mejor_key = keys_map[best_idx]

    # También le daremos un "bonus" heurístico si el nombre exacto está contenido
    for idx, doc in enumerate(corpus):
        if doc in consulta_norm and len(doc) > 5:
            # Si el usuario dice "quiero el certificado catastral por favor"
            # "certificado catastral" está contenido.
            if similitudes[idx] < 0.8:
                similitudes[idx] = 0.8
                
    best_idx = similitudes.argmax()
    mejor_score = float(similitudes[best_idx])
    mejor_key = keys_map[best_idx]

    # ¿Supera el umbral? 
    # TF-IDF Scores suelen ser más bajos que SequenceMatcher. Ajustamos el umbral (ej. 0.35)
    # pero usaremos la variable de entorno, ajustada a la lógica actual.
    threshold = 0.30 
    
    if mejor_score >= threshold:
        data = tramites[mejor_key]
        return SearchResult(
            tramite_key=mejor_key,
            tramite_nombre=data["nombre"],
            requisitos=data["requisitos"],
            score=round(mejor_score, 4),
            encontrado=True,
        )

    # Sin coincidencia suficiente
    return SearchResult(encontrado=False, score=round(mejor_score, 4))
