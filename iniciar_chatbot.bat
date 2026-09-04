@echo off
echo Configurando entorno virtual para el Chatbot...
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat
echo Instalando dependencias...
pip install -r requirements.txt
echo.
echo Iniciando servidor FastAPI...
start http://localhost:8000
python main.py
pause
