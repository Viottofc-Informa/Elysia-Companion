@echo off
REM Elysia Companion - Build and Package Script
REM Usage: build-and-package.cmd [install]

echo ========================================
echo   Elysia Companion - Build ^& Package
echo ========================================
echo.

cd /d "%~dp0"

REM Check if package.json exists
if not exist "package.json" (
    echo ERROR: package.json not found. Please run from extension root directory.
    exit /b 1
)

REM Step 1: Check/Install vsce
echo Step 1: Checking vsce...npx vsce --version >nul 2>&1
if errorlevel 1 (
    echo   vsce not found, installing globally...
    call npm install -g @vscode/vsce
    if errorlevel 1 (
        echo ERROR: Failed to install vsce
        exit /b 1
    )
) else (
    echo   vsce is available
)

REM Step 2: Install dependencies
echo.
echo Step 2: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    exit /b 1
)

REM Step 3: Compile TypeScript
echo.
echo Step 3: Compiling TypeScript...
call npm run compile
if errorlevel 1 (
    echo ERROR: TypeScript compilation failed
    exit /b 1
)
echo   Compilation successful

REM Step 4: Package the extension
echo.
echo Step 4: Packaging extension...

REM Remove old .vsix files
del /q *.vsix 2>nul

REM Package with vsce
call npx vsce package --no-dependencies
if errorlevel 1 (
    echo ERROR: Packaging failed
    exit /b 1
)

REM Find the generated .vsix file
for %%f in (*.vsix) do (
    echo   Created: %%f
    for %%a in ("%%f") do echo   Size: %%~za bytes

    REM Step 5: Install if requested
    if /i "%1"=="install" (
        echo.
        echo Step 5: Installing extension...
        call code --install-extension "%%f" --force
        if errorlevel 1 (
            echo WARNING: Installation may have failed
        ) else (
            echo   Installation successful
            echo.
            echo Please reload VS Code to activate the new version.
        )
    ) else (
        echo.
        echo To install, run: code --install-extension "%%f"
    )
    goto :done
)

echo ERROR: .vsix file not found after packaging
exit /b 1

:done
echo.
echo ========================================
echo   Build Complete!
echo ========================================
pause
