"""
Motor de Búsqueda Semántico – Base de Datos Vectorial con ChromaDB y nomic-embed-text.

Utiliza una base de datos vectorial persistente (ChromaDB) para indexar
y recuperar los trámites catastrales mediante embeddings generados localmente por Ollama.
"""

import httpx
import unicodedata
import chromadb
from chromadb.config import Settings

from app.domains.chatbot.infrastructure.postgres_repository import obtener_tramites
from app.domains.chatbot.presentation.schemas.chat_schemas import SearchResultSchema as SearchResult

# Inicializamos el cliente de ChromaDB con persistencia local
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="tramites_catastro", metadata={"hnsw:space": "cosine"})

def _normalizar(texto: str) -> str:
    """Normaliza un string para enviar al modelo de embeddings."""
    texto = texto.lower().strip()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return texto

async def obtener_embedding(texto: str) -> list[float]:
    """Genera un embedding usando nomic-embed-text vía Ollama."""
    texto_norm = _normalizar(texto)
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "http://localhost:11434/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": texto_norm}
        )
        response.raise_for_status()
        return response.json()["embedding"]

async def inicializar_vector_db():
    """Carga los trámites de MySQL a la BD Vectorial si no están indexados."""
    tramites = await obtener_tramites()
    if not tramites:
        return

    # Verificamos si ya hay documentos en la colección para no duplicar
    if collection.count() > 0:
        return 
        
    ids = []
    embeddings = []
    metadatas = []
    documents = []

    for key, data in tramites.items():
        candidatos = [data["nombre"]] + data.get("aliases", [])
        for idx, cand in enumerate(candidatos):
            emb = await obtener_embedding(cand)
            doc_id = f"{key}_{idx}"
            
            ids.append(doc_id)
            embeddings.append(emb)
            documents.append(cand)
            metadatas.append({"tramite_key": key, "nombre": data["nombre"]})
            
    if ids:
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents
        )

async def buscar_tramite(consulta_usuario: str) -> SearchResult:
    """
    Busca el trámite más relevante usando ChromaDB y nomic-embed-text.
    """
    consulta_norm = _normalizar(consulta_usuario)
    if not consulta_norm:
        return SearchResult(is_found=False, score=0.0)

    # Asegurar que la BD vectorial está poblada con los trámites actuales
    await inicializar_vector_db()

    # Vectorizar la consulta
    query_embedding = await obtener_embedding(consulta_usuario)
    
    if collection.count() == 0:
        return SearchResult(is_found=False, score=0.0)
        
    resultados = collection.query(
        query_embeddings=[query_embedding],
        n_results=1
    )
    
    if not resultados["ids"][0]:
        return SearchResult(is_found=False, score=0.0)
        
    # ChromaDB (con hnsw:space=cosine) devuelve "distancia coseno" (1 - similitud coseno).
    # Convertimos la distancia a un score de similitud donde 1 es idéntico y 0 es ortogonal.
    distancia = resultados["distances"][0][0]
    similitud = 1.0 - distancia
    
    # Umbral de similitud para match válido
    threshold = 0.50 
    
    if similitud >= threshold:
        metadata = resultados["metadatas"][0][0]
        tramite_key = metadata["tramite_key"]
        
        # Recuperar la info completa de MySQL usando la clave recuperada de la BD Vectorial
        tramites = await obtener_tramites()
        data = tramites.get(tramite_key)
        
        if data:
            return SearchResult(
                procedure_code=tramite_key,
                procedure_name=data.get("name", data.get("nombre")),
                requirements=data.get("procedure_requirement", data.get("requirements", data.get("requisitos"))),
                score=round(similitud, 4),
                is_found=True,
            )

    return SearchResult(is_found=False, score=round(similitud, 4))
