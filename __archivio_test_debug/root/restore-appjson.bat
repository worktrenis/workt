@echo off
REM Ripristina app.json da backup automatico (se presente)
IF EXIST app.json.bak (
  copy /Y app.json.bak app.json
  echo app.json ripristinato dal backup!
) ELSE (
  echo Nessun backup app.json.bak trovato.
)
