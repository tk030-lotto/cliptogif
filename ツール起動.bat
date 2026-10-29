@echo off
chcp 932 > nul
title ClipToGif - ツール起動

echo ========================================================
echo   ClipToGif を起動しています...
echo   （動画・画面録画の軽量GIF変換ツール）
echo ========================================================
echo.

:: 1. Python の確認
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo Python ローカルサーバーを起動します...
    echo ブラウザで http://127.0.0.1:5173 を開きます。
    start "" cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:5173"
    python -m http.server 5173 --bind 127.0.0.1
    exit /b 0
)

:: 2. Node.js の確認
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo Node.js ローカルサーバーを起動します...
    echo ブラウザで http://127.0.0.1:5173 を開きます。
    start "" cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:5173"
    call npx -y serve -p 5173 .
    exit /b 0
)

:: 3. フォールバック警告
echo [警告] Python または Node.js が見つかりませんでした。
echo 本ツールはブラウザのセキュリティ仕様（ES Modules / Web Worker）により、
echo 直接ファイルをダブルクリック（file://）して開くことはできません。
echo.
echo Python または Node.js をインストールするか、GitHub Pages版をご利用ください。
echo.
pause
exit /b 1
