# Publish AmanERP to GitHub (run once in PowerShell):
#   cd c:\Users\Dell\AMAN-ERP
#   powershell -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1

$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot\..

Write-Host "Checking GitHub login..." -ForegroundColor Cyan
gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Sign in to GitHub in your browser when prompted..." -ForegroundColor Yellow
  gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub login failed. Run: gh auth login" -ForegroundColor Red
    exit 1
  }
}

Write-Host "Creating repo and pushing code..." -ForegroundColor Cyan
gh repo view Pareshanlaunda/AmanERP *> $null
if ($LASTEXITCODE -ne 0) {
  gh repo create Pareshanlaunda/AmanERP --public --source=. --remote=origin --push
} else {
  git push -u origin main
}

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Done! https://github.com/Pareshanlaunda/AmanERP" -ForegroundColor Green
} else {
  Write-Host "Push failed. Check errors above." -ForegroundColor Red
  exit 1
}
