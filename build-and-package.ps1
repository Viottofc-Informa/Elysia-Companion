# Elysia Companion - Build and Package Script
# This script compiles TypeScript, packages the extension into a .vsix file,
# and optionally installs it in VS Code

param(
    [switch]$Install,
    [switch]$SkipCompile
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Elysia Companion - Build & Package" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run this script from the extension root directory."
    exit 1
}

# Step 1: Check/Install vsce
Write-Host "Step 1: Checking vsce (VS Code Extension CLI)..." -ForegroundColor Yellow
$vsce = Get-Command npx -ErrorAction SilentlyContinue
if (-not $vsce) {
    Write-Error "npx not found. Please install Node.js."
    exit 1
}

# Check if vsce is available
$hasVsce = $false
try {
    npx vsce --version 2>&1 | Out-Null
    $hasVsce = $true
} catch {
    $hasVsce = $false
}

if (-not $hasVsce) {
    Write-Host "  vsce not found. Installing..." -ForegroundColor DarkGray
    npm install -g @vscode/vsce
} else {
    Write-Host "  vsce is available ✓" -ForegroundColor Green
}

# Step 2: Install dependencies
Write-Host ""
Write-Host "Step 2: Installing dependencies..." -ForegroundColor Yellow
npm install

# Step 3: Compile TypeScript
if (-not $SkipCompile) {
    Write-Host ""
    Write-Host "Step 3: Compiling TypeScript..." -ForegroundColor Yellow
    npm run compile
    if ($LASTEXITCODE -ne 0) {
        Write-Error "TypeScript compilation failed!"
        exit 1
    }
    Write-Host "  Compilation successful ✓" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Step 3: Skipping compilation (--SkipCompile)" -ForegroundColor Yellow
}

# Step 4: Package the extension
Write-Host ""
Write-Host "Step 4: Packaging extension..." -ForegroundColor Yellow

# Remove old .vsix files
Get-ChildItem *.vsix -ErrorAction SilentlyContinue | Remove-Item -Force

# Package with vsce
npx vsce package --no-dependencies

if ($LASTEXITCODE -ne 0) {
    Write-Error "Packaging failed!"
    exit 1
}

# Find the generated .vsix file
$vsixFile = Get-ChildItem *.vsix | Select-Object -First 1
if (-not $vsixFile) {
    Write-Error ".vsix file not found after packaging!"
    exit 1
}

Write-Host "  Created: $($vsixFile.Name)" -ForegroundColor Green
Write-Host "  Size: $([math]::Round($vsixFile.Length / 1KB, 2)) KB" -ForegroundColor Green

# Step 5: Optional install
if ($Install) {
    Write-Host ""
    Write-Host "Step 5: Installing extension in VS Code..." -ForegroundColor Yellow
    code --install-extension $vsixFile.FullName --force
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Installation may have failed. You can install manually with: code --install-extension $($vsixFile.Name)"
    } else {
        Write-Host "  Installation successful ✓" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please reload VS Code to activate the new version." -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "To install the extension, run:" -ForegroundColor Cyan
    Write-Host "  code --install-extension $($vsixFile.Name)" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use the -Install flag:" -ForegroundColor Cyan
    Write-Host "  .\build-and-package.ps1 -Install" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
