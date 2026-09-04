from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
import json
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]

OLLAMA_URL = "http://localhost:11434/api/chat"
DEFAULT_MODEL = "gemma3:latest"

# Prompt de sistema para guiar el comportamiento del asistente
SYSTEM_PROMPT = """Eres el Asistente Catastral experto en trámites y requisitos del Gobierno Autónomo Municipal de Cochabamba (GAMC).
Tu objetivo es ayudar a los ciudadanos a conocer los requisitos, papeles faltantes y pasos para realizar trámites específicos de Catastro.
Responde de manera amable, clara y concisa.
Si no conoces la respuesta a un trámite específico, indícalo amablemente y sugiere acudir a las oficinas de Catastro correspondientes.

Información base de trámites catastrales (ejemplos):
1. Certificado Catastral: Requiere Fotocopia de CI, Folio Real actualizado, Testimonio de Propiedad y el último pago de impuestos.
2. Visación de Planos: Requiere Planos arquitectónicos firmados, Título de Propiedad, Folio Real y Fotocopia de CI.
3. Avalúo Catastral: Requiere solicitud escrita, Fotocopia de CI, y Certificado Alodial.

Mantén tus respuestas breves y directas."""

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    payload = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        return {"response": data["message"]["content"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def read_index():
    return FileResponse("index.html")

app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
