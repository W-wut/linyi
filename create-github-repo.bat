@echo off
chcp 65001 >nul
cd /d "C:\Users\2023-04-19\Desktop\20260508\2026-06-05-05-17-41"

echo ==========================================
echo  林一设计网站 · GitHub 仓库创建脚本
echo ==========================================
echo.
echo 使用方式：
echo 1. 打开 https://github.com/settings/tokens
echo 2. 点击 "Generate new token (classic)"
echo 3. Note 填 "deploy-token"，勾选 "repo" 权限
echo 4. 点击 Generate token，复制生成的 token
echo 5. 把 token 粘贴到下方
echo.

set /p GITHUB_USER=请输入你的 GitHub 用户名: 
set /p GITHUB_TOKEN=请输入你的 GitHub Token: 
set /p REPO_NAME=请输入仓库名称（默认: linyi-designer）: 

if "%REPO_NAME%"=="" set REPO_NAME=linyi-designer

if "%GITHUB_USER%"=="" (
    echo 错误：用户名不能为空。
    pause
    exit /b 1
)

if "%GITHUB_TOKEN%"=="" (
    echo 错误：Token 不能为空。
    pause
    exit /b 1
)

echo.
echo 正在创建 GitHub 仓库 %REPO_NAME%...
echo.

set http_proxy=
set https_proxy=
set HTTP_PROXY=
set HTTPS_PROXY=

:: 创建仓库
curl -s -X POST -H "Authorization: token %GITHUB_TOKEN%" -H "Accept: application/vnd.github.v3+json" https://api.github.com/user/repos -d "{\"name\":\"%REPO_NAME%\",\"private\":false,\"description\":\"林一室内设计个人网站\"}" > github-response.json

:: 检查是否成功
findstr /C:"\"name\":\"%REPO_NAME%\"" github-response.json >nul
if %errorlevel%==0 (
    echo ✅ 仓库创建成功！
    echo.
) else (
    findstr /C:"already exists" github-response.json >nul
    if %errorlevel%==0 (
        echo ℹ️ 仓库已存在，跳过创建。
    ) else (
        echo ❌ 创建失败，请检查 Token 和用户名是否正确。
        type github-response.json
        pause
        exit /b 1
    )
)

:: 设置 remote 并推送
echo 正在推送代码...
git remote remove origin 2>nul
git remote add origin https://%GITHUB_USER%:%GITHUB_TOKEN%@github.com/%GITHUB_USER%/%REPO_NAME%.git
git branch -m main
git push -u origin main

if %errorlevel%==0 (
    echo.
    echo ✅ 代码推送成功！
    echo 仓库地址: https://github.com/%GITHUB_USER%/%REPO_NAME%
) else (
    echo.
    echo ❌ 推送失败，请检查网络连接或 Token 权限。
)

del github-response.json 2>nul
pause
