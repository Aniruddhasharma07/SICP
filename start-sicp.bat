@echo off
title SICP - Starting Full Stack
echo ======================================================
echo   Starting SICP - Societal Innovation Portal
echo ======================================================

set PG_BIN=D:\SICP\tools\pgsql\bin\postgres.exe
set PG_DATA=D:\SICP\tools\pgdata
set REDIS_BIN=C:\Users\ani\AppData\Local\Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\Redis-8.10.1-Windows-x64-msys2\redis-server.exe
set PYTHON_BIN=C:\Users\ani\AppData\Local\Programs\Python\Python312\python.exe

echo [1/5] Starting PostgreSQL (Port 5432)...
start SICP-PostgreSQL /B %PG_BIN% -D %PG_DATA%
timeout /t 2 /nobreak >nul

echo [2/5] Starting Redis (Port 6379)...
start SICP-Redis /B %REDIS_BIN% --port 6379
timeout /t 2 /nobreak >nul

echo [3/5] Starting FastAPI AI Service (Port 8000)...
cd /d D:\SICP\ai-service
start SICP-AI-Service /B %PYTHON_BIN% -m uvicorn app.main:app --host 127.0.0.1 --port 8000
timeout /t 2 /nobreak >nul

echo [4/5] Starting Backend API (Port 5000)...
cd /d D:\SICP
start SICP-Backend /B node backend/dist/server.js
timeout /t 3 /nobreak >nul

echo [5/5] Starting Frontend Next.js (Port 3000)...
start SICP-Frontend cmd /k cd /d D:\SICP && npm run dev --prefix frontend

echo ======================================================
echo   SICP Stack is running:
echo   - Frontend:    http://localhost:3000
echo   - Backend API: http://localhost:5000
echo   - AI Service:  http://127.0.0.1:8000
echo   - Database:    127.0.0.1:5432
echo   - Redis:       127.0.0.1:6379
echo ======================================================
