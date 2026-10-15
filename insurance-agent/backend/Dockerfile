# Backend-only image (API on its own, frontend hosted/deployed separately).
# For a single-container/single-URL deploy (recommended - see
# ../../render.yaml and README "Деплой на Render"), build
# ../Dockerfile from the insurance-agent/ directory instead.

FROM python:3.11-slim

# tesseract-ocr (+ rus/kaz language packs) for OCR, libreoffice-writer for
# DOCX -> PDF export. This is the full set actually required; installing
# only "libreoffice" (core) is NOT enough - it lacks the Writer filters and
# fails every conversion with "source file could not be loaded".
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-rus tesseract-ocr-kaz \
    libreoffice-writer \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p storage/uploads storage/generated storage/tmp

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
