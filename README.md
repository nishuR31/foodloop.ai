# FoodLoop

FoodLoop has a modern AI architecture for scanning and processing food inventory.

## Architecture

Frontend
   ↓ (multipart/form-data)
Node/Fastify Backend
   ↓ (HTTP)
Python OCR Microservice
   ↓ (Inference)
PaddleOCR

## Python OCR Microservice

To run the Python OCR microservice independently:

1. `cd ocr`
2. `pip install -r requirements.txt`
3. `uvicorn app.main:app --host 0.0.0.0 --port 8000`

Or using Docker:

1. `cd ocr`
2. `docker-compose up -d`

**Example cURL request:**
```bash
curl -X POST \
  http://localhost:8000/v1/ocr/extract-label \
  -H "X-OCR-Service-Key: dev_ocr_secret_key_123" \
  -F "file=@sample.jpg"
```

## Node Backend

Requires `@fastify/multipart`.
Set `OCR_SERVICE_URL` and `OCR_SERVICE_API_KEY` in `.env`.
