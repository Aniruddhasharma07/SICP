@echo off
title SICP - Stopping Full Stack
echo Stopping SICP services...
taskkill /F /IM postgres.exe 2>nul
taskkill /F /IM redis-server.exe 2>nul
taskkill /F /IM uvicorn.exe 2>nul
taskkill /F /FI WINDOWTITLE eq SICP* 2>nul
echo Done! All services stopped.
