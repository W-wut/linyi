@echo off
chcp 65001 >nul
cd /d "C:\Users\2023-04-19\Desktop\20260508\2026-06-05-05-17-41"

echo 开始部署林一设计网站到 Vercel 生产环境...
echo.

set http_proxy=
set https_proxy=
set HTTP_PROXY=
set HTTPS_PROXY=

npx vercel --prod

echo.
echo 部署完成！请查看上方输出的 Production URL。
pause
