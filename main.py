"""
Chatbot Catastral – Entry point de la aplicación FastAPI.

Este archivo se mantiene mínimo: solo inicializa la app, registra
middleware, monta archivos estáticos e incluye los routers.
Toda la lógica de negocio reside en el paquete `app/`.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.domains.chatbot.presentation.endpoints.chat_router import router as chat_router
from app.domains.chatbot.presentation.endpoints.admin_router import router as admin_router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
)

# ---------------------------------------------------------------------------
# Aplicación FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Chatbot Catastral – GAMC",
    description="Backend RAG para el asistente de trámites catastrales.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(chat_router)
app.include_router(admin_router)

# ---------------------------------------------------------------------------
# Archivos estáticos & frontend
# ---------------------------------------------------------------------------
# (HTML estático removido en favor de React Frontend)

# ---------------------------------------------------------------------------
# Ejecución directa
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
