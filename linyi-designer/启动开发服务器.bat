@echo off
chcp 65001 >nul
cd /d "%~dp0"
cls
echo ========================================
echo    林一设计 · 本地开发服务器
echo ========================================
echo.

echo [1/3] 正在关闭旧进程...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo       旧进程已清理
echo.

echo [2/3] 正在启动服务器...
echo.
node scripts/dev-server.js
echo.

echo ========================================
echo 服务器已停止或发生错误
echo ========================================
pause
