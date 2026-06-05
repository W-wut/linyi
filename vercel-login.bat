@echo off
chcp 65001 >nul
cd /d "C:\Users\2023-04-19\Desktop\20260508\2026-06-05-05-17-41"

echo [1/2] 清除损坏的登录缓存...
rmdir /s /q "%APPDATA%\com.vercel.cli" 2>nul
echo 完成。

echo.
echo [2/2] 开始 Vercel 登录（绕过本地代理）...
echo 注意：执行后会显示一个 GitHub 链接，请复制到浏览器打开并授权。
echo.

set http_proxy=
set https_proxy=
set HTTP_PROXY=
set HTTPS_PROXY=

npx vercel login --github

echo.
echo 如果登录成功，请关闭此窗口，然后双击运行 "vercel-deploy.bat" 进行部署。
pause
