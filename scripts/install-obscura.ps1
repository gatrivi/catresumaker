# Install Obscura headless browser for CatResumeMaker Job OS (Windows).
# https://github.com/h4ckf0r0day/obscura
$ErrorActionPreference = "Stop"
$BinDir = Join-Path (Join-Path (Split-Path $PSScriptRoot -Parent) "bin") "obscura"

Write-Host "Obscura -> $BinDir"

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/h4ckf0r0day/obscura/releases/latest"
$asset = $release.assets | Where-Object { $_.name -match "windows.*\.zip$" } | Select-Object -First 1
if (-not $asset) {
  $asset = $release.assets | Where-Object { $_.name -match "\.zip$" } | Select-Object -First 1
}
if (-not $asset) {
  throw "No Windows zip in latest release. Download manually: https://github.com/h4ckf0r0day/obscura/releases"
}

$zip = Join-Path $env:TEMP "obscura.zip"
Write-Host "Downloading $($asset.name)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip
Expand-Archive -Path $zip -DestinationPath $BinDir -Force
Remove-Item $zip -Force

$exe = Get-ChildItem -Path $BinDir -Recurse -Filter "obscura.exe" | Select-Object -First 1
if (-not $exe) {
  throw "obscura.exe not found after extract"
}

Write-Host ""
Write-Host "OK: $($exe.FullName)"
Write-Host "Add to .env:"
Write-Host "OBSCURA_BIN=$($exe.FullName)"
Write-Host "OBSCURA_STEALTH=1"
