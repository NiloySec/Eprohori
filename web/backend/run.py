"""Entrypoint that resolves $PORT via Python instead of shell expansion.

Use this when the deploy platform (Railway, Render, etc.) executes the start
command via execve without a shell — variable expansion needs to happen in
Python itself.
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
