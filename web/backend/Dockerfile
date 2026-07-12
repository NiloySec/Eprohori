FROM python:3.11-slim

# Faster Python, no .pyc clutter, unbuffered output for live logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    whois \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install deps first (better layer caching)
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy source (data/, *.py, Procfile, etc.)
COPY . .

# Railway provides $PORT at runtime; default 8000 for local docker runs
ENV PORT=8000
EXPOSE 8000

CMD ["python", "run.py"]