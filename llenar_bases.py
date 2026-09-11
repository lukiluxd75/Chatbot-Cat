import json
import os
import sys
import asyncio
import logging

# Aseguramos que el directorio actual y app/ estén en el path para las importaciones
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from app.domains.chatbot.infrastructure.postgres_repository import _get_connection
from app.domains.chatbot.services.vector_search import inicializar_vector_db

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Ruta del JSON que contiene los datos de los trámites
JSON_PATH = os.path.join(BASE_DIR, "..", "tramites_data.json")

def llenar_postgres():
    if not os.path.exists(JSON_PATH):
        logger.error(f"No se encontró el archivo JSON en: {JSON_PATH}")
        return

    logger.info(f"Leyendo datos desde {JSON_PATH}...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        content = f.read()
        
    import re
    # El archivo JSON tiene múltiples arrays concatenados (ej: ]\n[ o ][)
    # Reemplazamos todos los '] [' por ','
    content = re.sub(r'\]\s*\[', ',', content)
    
    data = json.loads(content)

    conn = _get_connection()
    try:
        cursor = conn.cursor()
        
        # Ampliamos el tamaño de la columna cost_note para evitar errores de longitud
        cursor.execute("ALTER TABLE procedure ALTER COLUMN cost_note TYPE TEXT;")
        
        for item in data:
            clave = item.get("id_tramite")
            nombre = item.get("nombre_tramite")
            descripcion = item.get("descripcion_busqueda")
            costo = item.get("costo")
            leyes = item.get("leyes_asociadas", [])
            base_legal = ", ".join(leyes) if leyes else None

            # 1. Insertar o actualizar el trámite
            query_tramite = """
                INSERT INTO procedure (code, name, description, cost_note, legal_basis)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    cost_note = EXCLUDED.cost_note,
                    legal_basis = EXCLUDED.legal_basis
            """
            cursor.execute(query_tramite, (clave, nombre, descripcion, costo, base_legal))
            
            # Obtener el ID interno autogenerado
            cursor.execute("SELECT id FROM procedure WHERE code = %s", (clave,))
            row = cursor.fetchone()
            if not row:
                continue
            tramite_id = row[0]

            # 2. Insertar requisitos
            # Primero eliminamos los antiguos para evitar duplicados en caso de re-ejecución
            cursor.execute("DELETE FROM procedure_requirement WHERE procedure_id = %s", (tramite_id,))
            
            requisitos = item.get("requisitos", [])
            for idx, req in enumerate(requisitos):
                req_desc = req.get("nombre")
                req_obliga = 1 if req.get("obligatorio") else 0
                
                query_req = """
                    INSERT INTO procedure_requirement (procedure_id, description, display_order, is_mandatory)
                    VALUES (%s, %s, %s, %s)
                """
                cursor.execute(query_req, (tramite_id, req_desc, idx, req_obliga))
            
            logger.info(f"Trámite '{clave}' procesado en PostgreSQL.")

        conn.commit()
        logger.info("✅ Base de datos PostgreSQL poblada exitosamente.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Error al poblar PostgreSQL: {e}")
    finally:
        from app.domains.chatbot.infrastructure.postgres_repository import _release_connection
        cursor.close()
        _release_connection(conn)

async def llenar_chromadb():
    logger.info("Inicializando ChromaDB (indexando vectores)...")
    try:
        # Llama a la función del backend que indexa los trámites desde PostgreSQL
        await inicializar_vector_db()
        logger.info("✅ ChromaDB indexado/poblado exitosamente.")
    except Exception as e:
        logger.error(f"Error al poblar ChromaDB: {e}")
        logger.info("⚠️ Asegúrate de que Ollama y el servicio de embeddings estén corriendo (localhost:11434).")

async def main():
    logger.info("Iniciando script de llenado de bases de datos...")
    # Primero insertamos los datos estructurados en Postgres
    llenar_postgres()
    # Luego actualizamos ChromaDB para las búsquedas semánticas
    await llenar_chromadb()
    logger.info("🎉 Proceso finalizado.")

if __name__ == "__main__":
    asyncio.run(main())
