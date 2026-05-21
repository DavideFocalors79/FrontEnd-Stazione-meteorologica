@echo off
title Stazione Meteo

:: Controlla che PHP sia installato
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo PHP non trovato nel PATH.
    echo Scaricalo da https://windows.php.net/download/ oppure installa XAMPP.
    echo.
    pause
    exit /b 1
)

echo Avvio server Stazione Meteo su http://localhost:8080 ...
echo Premi CTRL+C per fermare il server.
echo.

:: Apre il browser dopo 2 secondi (in background)
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

:: Avvia il server PHP nella cartella corrente
php -S localhost:8080 -t "%~dp0"
