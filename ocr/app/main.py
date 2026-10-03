from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
from app.api import routes
from app.ocr.engine import ocr_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FoodLoop OCR Service")

@app.get("/")
async def root():
    return {"status": "ok", "service": "foodloop-ocr"}

@app.get("/ping")
async def ping():
    return {"ping": "pong"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ocr"}

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing PaddleOCR Engine...")
    ocr_engine.initialize()
    logger.info("PaddleOCR Engine initialized.")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "Internal Server Error"}}
    )

app.include_router(routes.router)

