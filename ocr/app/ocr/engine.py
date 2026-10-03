import os
import numpy as np
import logging
from paddleocr import PaddleOCR
from pyzbar.pyzbar import decode

logger = logging.getLogger(__name__)

class OcrEngine:
    def __init__(self):
        self.lang = os.getenv("OCR_LANG", "en")
        self._is_ready = False
        self.ocr = None

    def initialize(self):
        logger.info("Initializing PaddleOCR and pyzbar...")
        self.ocr = PaddleOCR(use_angle_cls=True, lang=self.lang)
        self._is_ready = True
        logger.info("PaddleOCR engine ready.")

    def is_ready(self):
        return self._is_ready

    def extract_text(self, image):
        if not self._is_ready:
            raise Exception("OCR Engine not initialized")

        # image is a PIL Image
        # Convert PIL Image to numpy array
        img_array = np.array(image.convert('RGB'))
        
        extracted_data = []

        # 1. Barcode scanning with pyzbar
        try:
            barcodes = decode(image)
            for barcode in barcodes:
                barcode_data = barcode.data.decode('utf-8')
                barcode_type = barcode.type
                rect = barcode.rect
                extracted_data.append({
                    "text": f"[{barcode_type}] {barcode_data}",
                    "confidence": 1.0,
                    "bbox": [[rect.left, rect.top], [rect.left + rect.width, rect.top], [rect.left + rect.width, rect.top + rect.height], [rect.left, rect.top + rect.height]]
                })
                logger.info(f"Found barcode: {barcode_data} ({barcode_type})")
        except Exception as e:
            logger.warning(f"Barcode decoding failed: {e}")

        # 2. Text extraction with PaddleOCR
        try:
            result = self.ocr.ocr(img_array, cls=True)
            if result and result[0]:
                for line in result[0]:
                    box = line[0]
                    text = line[1][0]
                    confidence = line[1][1]
                    extracted_data.append({
                        "text": text,
                        "confidence": float(confidence),
                        "bbox": box
                    })
        except Exception as e:
            logger.error(f"OCR failed: {e}")
                
        return extracted_data

ocr_engine = OcrEngine()
