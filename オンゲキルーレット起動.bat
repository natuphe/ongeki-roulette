@echo off
cd /d "%~dp0"

echo オンゲキルーレットを起動しています...

start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5173/'"

call npm run dev