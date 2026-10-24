@echo off
title WhatsApp Gateway LPTQ Blokagung
color 0A
echo ========================================================
echo   MENJALANKAN WHATSAPP GATEWAY (WAHA) LPTQ BLOKAGUNG
echo ========================================================
echo.
cd /d "%~dp0waha-gateway"

echo Menjalankan Server Gateway di Port 3008...
start "WAHA Gateway Server" cmd /k "node server.js"

timeout /t 3 /nobreak >nul

echo Menjalankan Tunnel HTTPS Cloudflare...
start "WAHA HTTPS Tunnel" cmd /k "npx --yes cloudflared tunnel --url http://localhost:3008"

timeout /t 3 /nobreak >nul

echo Membuka Halaman Scan QR Code di Browser...
start http://localhost:3008

echo.
echo ========================================================
echo   SERVER BERHASIL DIAKTIFKAN!
echo   Silakan scan QR Code yang muncul di browser.
echo ========================================================
pause
