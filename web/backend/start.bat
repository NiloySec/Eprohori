@echo off
cd /d %~dp0
call venv\Scripts\activate
echo Starting Eprohori API on http://localhost:8000 ...
echo Docs: http://localhost:8000/docs
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
