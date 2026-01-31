@echo off
title WORKT - Automazione Versioning

echo.
echo 🚀 AUTOMAZIONE VERSIONING WORKT
echo =================================
echo.

:: Verifica directory corretta
if not exist "package.json" (
    echo ❌ Errore: Esegui questo script dalla root del progetto
    pause
    exit /b 1
)

:: Menu di scelta
echo Seleziona il tipo di aggiornamento:
echo.
echo [1] PATCH   - Correzioni bug (es: 1.4.2 → 1.4.3)
echo [2] MINOR   - Nuove features (es: 1.4.2 → 1.5.0)  
echo [3] MAJOR   - Breaking changes (es: 1.4.2 → 2.0.0)
echo [4] CUSTOM  - Inserimento manuale parametri
echo.

set /p choice="Scelta (1-4): "

if "%choice%"=="1" (
    set vtype=patch
    set msg=Correzioni bug e miglioramenti stabilità
) else if "%choice%"=="2" (
    set vtype=minor
    set msg=Nuove funzionalità e miglioramenti
) else if "%choice%"=="3" (
    set vtype=major
    set msg=Aggiornamento maggiore con modifiche significative
) else if "%choice%"=="4" (
    goto custom
) else (
    echo Scelta non valida
    pause
    exit /b 1
)

goto execute

:custom
echo.
set /p vtype="Tipo versione (patch/minor/major): "
set /p msg="Messaggio personalizzato: "

:execute
echo.
echo 🔧 Tipo: %vtype%
echo 📝 Messaggio: %msg%
echo.
echo Procedo con l'aggiornamento...
echo.

:: Esegui lo script Node.js
node scripts/auto-version-update.js %vtype% "%msg%"

if %errorlevel% equ 0 (
    echo.
    echo 🎉 AGGIORNAMENTO COMPLETATO!
    echo.
    echo 💡 Prossimi passi:
    echo    - Verifica: git log --oneline -n 3
    echo    - Pubblica: git push origin production --tags
    echo    - Test app per verificare nuova versione
) else (
    echo.
    echo ❌ Errore durante l'aggiornamento
)

echo.
pause
