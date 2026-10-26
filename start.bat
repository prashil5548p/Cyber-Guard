@echo off
echo ============================================
echo   CyberGuard AI - Starting Services
echo ============================================
echo.
echo [1/2] Starting FastAPI Backend on port 8000...
start "CyberGuard Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --reload --port 8000"
echo.
echo [2/2] Starting React Frontend on port 5173...
start "CyberGuard Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo ============================================
echo   Services starting...
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo   Demo Login:
echo   Email: admin@cyberguard.ai
echo   Password: CyberGuard@2024
echo ============================================
timeout /t 5
start http://localhost:5173
