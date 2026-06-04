@echo off
chcp 65001 >nul
cd /d "C:\Users\2023-04-19\Desktop\20260508\2026-06-05-05-17-41"

echo ==========================================
echo  林一设计网站 · Vercel Token 部署脚本
echo ==========================================
echo.
echo 使用方式：
echo 1. 打开 https://vercel.com/account/tokens
echo 2. 点击 "Create Token"
echo 3. Name 填 "deploy-linyi"，Scope 保持默认
echo 4. 复制生成的 Token
echo 5. 把 Token 粘贴到下方，按回车
echo.

set /p TOKEN=请输入 Vercel Token: 

if "%TOKEN%"=="" (
    echo 错误：Token 不能为空。
    pause
    exit /b 1
)

echo.
echo 正在部署到 Vercel 生产环境...
echo.

set http_proxy=
set https_proxy=
set HTTP_PROXY=
set HTTPS_PROXY=

npx vercel --prod --token=%TOKEN%

echo.
echo 部署完成！请查看上方输出的 Production URL。
pause
