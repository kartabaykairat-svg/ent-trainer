# Single-container build: React/Vite frontend compiled to static files,
# served by the same FastAPI process that serves the API - one container,
# one URL, no CORS/proxy configuration needed in production.

FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

# tesseract-ocr (+ rus/kaz language packs) for OCR, libreoffice-writer for
# DOCX -> PDF export. Installing only "libreoffice" (core) is NOT enough -
# it lacks the Writer filters and fails every conversion with
# "Error: source file could not be loaded".
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-rus tesseract-ocr-kaz \
    libreoffice-writer \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /frontend/dist ./static
RUN mkdir -p storage/uploads storage/generated storage/tmp

ENV FRONTEND_DIST=/app/static
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
