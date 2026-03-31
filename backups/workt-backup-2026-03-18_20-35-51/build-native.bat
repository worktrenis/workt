@echo off
REM Build nativa parallela WorkT (config: app-native.json via APP_CONFIG)
REM Richiede EAS CLI installato (npm install -g eas-cli)

echo Building APK parallelo...
eas build --platform android --profile native

echo.
echo Per iOS usa:
echo eas build --platform ios --profile native
