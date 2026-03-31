# 🚀 SCRIPT AUTOMAZIONE VERSIONING WORKT
# Wrapper PowerShell per aggiornamento automatico versioni

param(
    [Parameter(Position=0)]
    [ValidateSet("patch", "minor", "major")]
    [string]$VersionType = "patch",
    
    [Parameter(Position=1)]
    [string]$Message = "",
    
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$Changes = @()
)

Write-Host "🚀 AUTOMAZIONE VERSIONING WORKT" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Verifica che siamo nella directory corretta
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Errore: Esegui questo script dalla root del progetto" -ForegroundColor Red
    exit 1
}

# Verifica che Node.js sia disponibile
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js rilevato: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Errore: Node.js non trovato" -ForegroundColor Red
    exit 1
}

# Costruisci il comando
$cmd = "node scripts/auto-version-update.js $VersionType"
if ($Message -ne "") {
    $cmd += " `"$Message`""
}
foreach ($change in $Changes) {
    $cmd += " `"$change`""
}

Write-Host "🔧 Comando: $cmd" -ForegroundColor Yellow
Write-Host ""

# Esegui l'aggiornamento
try {
    Invoke-Expression $cmd
    Write-Host ""
    Write-Host "🎉 AGGIORNAMENTO COMPLETATO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Prossimi passi:" -ForegroundColor Cyan
    Write-Host "   - Verifica che tutto sia corretto con: git log --oneline -n 3" -ForegroundColor White
    Write-Host "   - Pubblica con: git push origin production --tags" -ForegroundColor White
    Write-Host "   - Test dell'app per verificare la nuova versione" -ForegroundColor White
} catch {
    Write-Host ""
    Write-Host "❌ Errore durante l'aggiornamento: $_" -ForegroundColor Red
    exit 1
}
