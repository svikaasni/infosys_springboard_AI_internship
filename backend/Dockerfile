# Intelligent Bug Diagnosis Platform with Fix Recommendation Assistance — backend image
#
# Uses only backend/requirements.txt (the lean, offline-capable dependency
# set) by design: the Duplicate Detection Agent's TF-IDF fallback path is
# what's been verified end-to-end for this project. If you want the optional
# Sentence-Transformers + FAISS semantic-embedding upgrade baked into the
# image instead, add:
#     COPY requirements-semantic.txt .
#     RUN pip install --no-cache-dir -r requirements-semantic.txt
# after the requirements.txt install below — be aware this pulls in torch
# and produces a multi-gigabyte image.
FROM python:3.12-slim

WORKDIR /app

# gcc/build-essential covers scikit-learn/numpy source builds on
# architectures without a prebuilt wheel; harmless no-op otherwise.
# tesseract-ocr is required for the OCR feature (screenshot text extraction
# on bug attachments) — see app/services/ocr.py. It degrades gracefully if
# missing, but it's cheap to include here so it works out of the box.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# SQLite file and uploaded attachments live here, outside the image layer,
# so they can be mounted as a volume in docker-compose.
RUN mkdir -p /app/data /app/uploads

ENV DATABASE_URL=sqlite:////app/data/bug_analyzer.db
ENV UPLOAD_DIR=/app/uploads
ENV CORS_ORIGINS=http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
