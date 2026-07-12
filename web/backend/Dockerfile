FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y \
    whois \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Clean up build dependencies
RUN apt-get purge -y --auto-remove gcc python3-dev libpq-dev && rm -rf /var/lib/apt/lists/*

COPY . .

# Railway automatically sets $PORT
ENV PORT=8000
EXPOSE 8000

CMD ["python", "run.py"]
