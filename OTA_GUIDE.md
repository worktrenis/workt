# OTA Guide (EAS Update) — WorkT

## Metodo consigliato (da VS Code)

- `Ctrl+Shift+P` → **Run Task** → cerca **OTA:**
  - **OTA: Publish (production)** → pubblica OTA con messaggio
  - **OTA: Auto (bump patch, skip git)** → incrementa patch + aggiorna metadata/changelog + pubblica
  - **Diagnostics: Node Resolution** → controlla che `node` non punti allo stub `C:\Windows\System32\node`

Le task sono definite in: `.vscode/tasks.json`

## Metodo da terminale

- Publish diretto (senza bump versione):
  - `npx eas update --channel production --message "..."`

- Release con script (aggiorna versioni + changelog + publish):
  - `npm run ota:release -- --skip-git --message "..."`

- Release auto (bump patch + publish):
  - `npm run ota:auto -- --skip-git --message "..."`

## Note importanti

- Canale in uso: `production`
- `runtimeVersion` deve rimanere compatibile con la build installata sui dispositivi.
- Se vedi in output: “No compatible builds found for fingerprints” ma sui telefoni l’OTA arriva, puoi ignorarlo.

## Troubleshooting Node su Windows

Se `Get-Command node` mostra `C:\Windows\System32\node` (stub), metti `C:\Program Files\nodejs\` prima nel PATH e riapri VS Code.

Doctor: `scripts/windows-node-doctor.ps1`
