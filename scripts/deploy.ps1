# Deploy the emergency-fund Soroban contract to testnet (Windows PowerShell)
# Writes NEXT_PUBLIC_CONTRACT_ID into web/.env.local

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root 'web\.env.local'

Write-Host "=== Building emergency-fund contract ===" -ForegroundColor Cyan
Set-Location $root
stellar contract build

$wasm = Join-Path $root 'target\wasm32v1-none\release\emergency_fund.wasm'
if (-not (Test-Path $wasm)) {
    Write-Error "WASM not found: $wasm"
}

Write-Host ""
Write-Host "=== Deploying to testnet ===" -ForegroundColor Cyan
$contractId = stellar contract deploy `
    --wasm $wasm `
    --source-account workshop `
    --network testnet `
    --quiet

Write-Host "Contract ID: $contractId"

# Update .env.local
if (-not (Test-Path $envFile)) { New-Item -Path $envFile -ItemType File | Out-Null }
$lines = Get-Content $envFile -ErrorAction SilentlyContinue | Where-Object { $_ -notmatch '^NEXT_PUBLIC_CONTRACT_ID=' }
$lines + "NEXT_PUBLIC_CONTRACT_ID=$contractId" | Set-Content $envFile

Write-Host ""
Write-Host "✅  Done! web\.env.local updated." -ForegroundColor Green
Write-Host "    Restart 'npm run dev' to apply." -ForegroundColor Green
