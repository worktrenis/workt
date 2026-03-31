@echo off
echo ========================================
echo       WorkT - Build Nativa v1.1.0
echo ========================================
echo.

echo [1/6] Backup configurazione development...
copy app.json app-dev-backup.json

echo [2/6] Switching to production config...
copy app-production.json app.json

echo [3/6] Bump version automatico...
node scripts/bump-version.js

echo [4/6] Building native app con EAS...
echo Avviando build production con aggiornamenti OTA...
eas build --platform android --profile production-with-updates

echo [5/6] Pubblicazione update OTA...
echo Pubblicando aggiornamento sul canale production...
eas update --channel production --message "v1.1.0: Sistema notifiche reperibilità completo + UI migliorata"

echo [6/6] Ripristino configurazione development...
copy app-dev-backup.json app.json
del app-dev-backup.json

echo.
echo ========================================
echo   Build nativa completata con successo!
echo ========================================
echo.
echo La build include:
echo ✅ Sistema notifiche reperibilità completo
echo ✅ Aggiornamenti automatici OTA
echo ✅ UI configurazione ottimizzata
echo ✅ Backup automatico in background
echo ✅ Logging dettagliato per debugging
echo.
echo Gli utenti riceveranno aggiornamenti automatici
echo all'apertura dell'app senza reinstallazione.
echo.
pause
