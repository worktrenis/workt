# Diagnostica rapida per risoluzione Node su Windows
# Scopo: individuare quando `node` punta a uno stub (es. C:\Windows\System32\node) e suggerire fix.

$ErrorActionPreference = 'Continue'

Write-Host "== Node Doctor (Windows) ==" -ForegroundColor Cyan

try {
  $cmd = Get-Command node -ErrorAction Stop
  Write-Host "node Source: $($cmd.Source)"
  Write-Host "node Path  : $($cmd.Path)"
  Write-Host "node Ver   : $($cmd.Version)"
} catch {
  Write-Host "node non trovato in PATH." -ForegroundColor Yellow
}

Write-Host "---"
try {
  Write-Host "where node:" -ForegroundColor Gray
  where.exe node
} catch {
  Write-Host "where.exe node ha fallito." -ForegroundColor Yellow
}

Write-Host "---"
$expectedNode = "C:\Program Files\nodejs\node.exe"
if (Test-Path $expectedNode) {
  Write-Host "Node atteso trovato: $expectedNode" -ForegroundColor Green
  & $expectedNode --version
} else {
  Write-Host "Node atteso NON trovato in: $expectedNode" -ForegroundColor Yellow
}

Write-Host "---"
$stubPath = "C:\Windows\System32\node"
if ($cmd -and ($cmd.Source -eq $stubPath -or $cmd.Path -eq $stubPath)) {
  Write-Host "ATTENZIONE: `node` risolve a uno stub in System32." -ForegroundColor Yellow
  Write-Host "Questo può rompere script npm che invocano 'node ...'." -ForegroundColor Yellow
  Write-Host "Fix consigliato (manuale): metti 'C:\Program Files\nodejs\' prima nel PATH (User/System)." -ForegroundColor Gray
  Write-Host "Poi riapri terminale/VS Code." -ForegroundColor Gray
} else {
  Write-Host "OK: `node` non sembra puntare allo stub System32." -ForegroundColor Green
}
