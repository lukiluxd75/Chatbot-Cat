@echo off
echo Configurando entorno virtual para el Chatbot...
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat
echo Instalando dependencias...
pip install -r requirements.txt
echo.
echo Iniciando Backend (FastAPI)...
start cmd /k "call venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000"

echo Iniciando Frontend (React Vite)...
cd frontend
if not exist "node_modules" (
    echo Instalando dependencias del frontend...
    npm install
)
start cmd /k "npm run dev"
echo.
echo Todo listo. Cierra esta ventana si quieres detener el script inicial (las ventanas de cmd seguirán abiertas).
pause
