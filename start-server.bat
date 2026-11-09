@echo off
title MyToDoList Local Server
echo 正在啟動 MyToDoList 本地伺服器...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
pause
