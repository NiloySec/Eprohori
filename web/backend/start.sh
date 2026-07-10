#!/bin/sh
# Railway/Docker startup — always expands $PORT correctly
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
