# Elysia Companion - Build and Release Script (PowerShell)
# This script compiles TypeScript, creates VSIX, and prepares for GitHub release

$ErrorActionPreference = "Stop"

$Green = "`e[32m"
$Cyan = "`e[36m"
$Yellow = "`e[33m"
$Reset = "`e[0m"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Elysia Companion v0.2.0 - Release Build" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify directory
Write-Host "Step 1: Verifying project directory..." -ForegroundColor Yellow
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run this script from the extension root."
    exit 1
}
Write-Host "✓ Project directory OK" -ForegroundColor Green

# Step 2: Clean previous builds
Write-Host "Step 2: Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Path "out" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "*.vsix" -Force -ErrorAction SilentlyContinue
Write-Host "✓ Cleaned" -ForegroundColor Green

# Step 3: Install dependencies
Write-Host "Step 3: Installing dependencies..." -ForegroundColor Yellow
npm install --production=$false
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Step 4: Compile TypeScript
Write-Host "Step 4: Compiling TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Error "TypeScript compilation failed!"
    exit 1
}
Write-Host "✓ TypeScript compiled" -ForegroundColor Green

# Step 5: Check vsce
Write-Host "Step 5: Checking vsce CLI..." -ForegroundColor Yellow
try {
    $vsceVersion = npx vsce --version 2>&1
    Write-Host "✓ vsce is available ($vsceVersion)" -ForegroundColor Green
} catch {
    Write-Host "Installing vsce..." -ForegroundColor Yellow
    npm install -g @vscode/vsce
    Write-Host "✓ vsce installed" -ForegroundColor Green
}

# Step 6: Create VSIX
Write-Host "Step 6: Creating VSIX package..." -ForegroundColor Yellow
npx vsce package --no-dependencies
if ($LASTEXITCODE -ne 0) {
    Write-Error "VSIX packaging failed!"
    exit 1
}
Write-Host "✓ VSIX created" -ForegroundColor Green

# Step 7: Move to releases folder
Write-Host "Step 7: Moving to releases folder..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "releases" | Out-Null
Get-ChildItem "*.vsix" | Move-Item -Destination "releases/"
Write-Host "✓ Moved to releases/" -ForegroundColor Green

# Step 8: List final files
Write-Host "Step 8: Final artifacts..." -ForegroundColor Yellow
Get-ChildItem "releases/*.vsix" | ForEach-Object {
    Write-Host "  → $($_.Name) ($([math]::Round($_.Length/1KB,2)) KB)" -ForegroundColor Green
}

# Step 9: GitHub release instructions
Write-Host ""
Write-Host "Step 9: Preparing GitHub release..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Run the following commands to push to GitHub:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  git add -A" -ForegroundColor White
Write-Host "  git commit -m 'Release v0.2.0: Compression Stats tab with detailed metrics'" -ForegroundColor White
Write-Host "  git tag v0.2.0" -ForegroundColor White
Write-Host "  git push origin main --tags" -ForegroundColor White
Write-Host ""
Write-Host "Then create release on GitHub:" -ForegroundColor Cyan
Write-Host "  https://github.com/Viottofc-Informa/Elysia-Companion/releases/new?tag=v0.2.0" -ForegroundColor White
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ✓ Build Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "VSIX Location: releases/elysia-companion-0.2.0.vsix" -ForegroundColor Cyan
Write-Host "Install with:  code --install-extension releases/elysia-companion-0.2.0.vsix" -ForegroundColor Cyan
Write-Host ""

# Optional: Auto-install
$install = Read-Host "Install extension now? (y/n)"
if ($install -eq 'y' -or $install -eq 'Y') {
    $vsixFile = Get-ChildItem "releases/*.vsix" | Select-Object -First 1
    if ($vsixFile) {
        Write-Host "Installing extension..." -ForegroundColor Yellow
        code --install-extension $vsixFile.FullName --force
        Write-Host "✓ Extension installed! Please reload VS Code." -ForegroundColor Green
    }
}
