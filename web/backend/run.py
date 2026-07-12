"""Entrypoint that resolves $PORT via Python instead of shell expansion.

Use this when the deploy platform (Railway, Render, etc.) executes the start
command via execve without a shell — variable expansion needs to happen in
Python itself.
"""
import os
import uvicorn
import sys

if __name__ == "__main__":
    print("--- EProhori Backend Starting ---")
    print(f"Python Version: {sys.version}")
    port = int(os.environ.get("PORT", 8000))
    print(f"Selected Port: {port}")

    try:
        uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
    except Exception as e:
        print(f"CRITICAL STARTUP ERROR: {e}")
        sys.exit(1)
