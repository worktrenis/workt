# Backup script for Workt project
# Usage: Run this PowerShell script from the root of the workspace.
# It will create a zip archive of the repository (excluding common folders) and
# a file containing restoration instructions.

# compute paths
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $PWD "backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$backupFile = Join-Path $backupDir ("workt-backup-" + $timestamp + ".zip")

# choose items to include
$items = Get-ChildItem -Force | Where-Object { $_.Name -notin @("backups","node_modules",".git",".expo") }

Compress-Archive -Path $items.FullName -DestinationPath $backupFile -CompressionLevel Optimal -Force

# create a note file with restore instructions
$noteFile = Join-Path $backupDir ("workt-backup-" + $timestamp + "-README.txt")
@"
Questo archivio è stato generato da scripts/backup-with-notes.ps1 il $(Get-Date).

Per ripristinare il backup:

1. Estrai il file in una cartella sicura, ad esempio con `unzip workt-backup-*.zip -d workt-restored`.
2. Copia la cartella estratta nella posizione di lavoro o aprila direttamente in Visual Studio Code.
3. Dopo l'estrazione esegui `npm install` o `yarn` per ricreare le dipendenze.
4. Se usi Expo su Windows potresti dover eseguire anche `expo prebuild` o altri comandi
   specifici indicati nel README del progetto.
5. Ricorda di rimuovere file sensibili o configurazioni locali prima di effettuare commit.

NOTA: l'archivio non contiene `node_modules`, la cartella `.git` né eventuali altri
      backup, quindi dovrai reinstallare i pacchetti (`npm install`/`yarn install`) 
      dopo il ripristino.

Buon lavoro con il codice! 😉
"@ | Out-File -Encoding UTF8 $noteFile

Write-Host "Backup created:" $backupFile
Write-Host "Instructions file:" $noteFile
