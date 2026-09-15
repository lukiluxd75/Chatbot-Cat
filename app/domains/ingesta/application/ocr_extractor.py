import cv2
import numpy as np
import pytesseract
import logging

logger = logging.getLogger(__name__)

async def extraer_texto_ocr(imagen_bytes: bytes) -> str:
    """
    Pipeline de preprocesamiento y OCR (CPU/Ligero):
    1. Lee la imagen subida y conviértela a un array de NumPy.
    2. Aplica filtro de escala de grises y binarización (thresholding) con cv2.
    3. Extrae texto con pytesseract.
    """
    # 1. Convertir bytes a array de NumPy
    nparr = np.frombuffer(imagen_bytes, np.uint8)
    
    # 2. Decodificar la imagen en formato OpenCV
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen. El formato podría ser inválido.")
    
    logger.info("Imagen decodificada exitosamente, tamaño: %s", img.shape)

    # 3. Preprocesamiento: Escala de grises
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 4. Preprocesamiento: Binarización (Thresholding) para limpiar el fondo
    # Usamos OTSU para encontrar el umbral óptimo
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    logger.info("Filtros de escala de grises y binarización aplicados.")

    # 5. Extracción de texto con Tesseract
    # Fuerza la ruta explícita para evitar problemas de PATH en Windows
    import os
    tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path

    # Apuntar a la carpeta local 'tessdata' usando la variable de entorno
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    tessdata_dir = os.path.join(base_dir, 'tessdata')
    os.environ['TESSDATA_PREFIX'] = tessdata_dir

    try:
        texto_crudo = pytesseract.image_to_string(thresh, lang='spa')
    except Exception as e:
        logger.error("Error al ejecutar Tesseract OCR: %s", str(e))
        raise RuntimeError(f"Fallo en Tesseract OCR (¿está instalado Tesseract?). Detalle: {e}")

    texto_limpio = texto_crudo.strip()
    
    if not texto_limpio:
        raise ValueError("El OCR retornó una respuesta vacía. Verifica que la imagen contiene texto legible.")
        
    logger.info("OCR exitoso – %d caracteres extraídos.", len(texto_limpio))
    return texto_limpio
