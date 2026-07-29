---
type: Documentation
title: Elysia Companion - Setup Guide
resource: https://github.com/informa/elysia-companion
tags:
  - setup
  - installation
  - configuration
  - elysia
  - vscode
timestamp: '2026-07-29'
---

# Elysia Companion — Setup & Installation Guide

> **One-time setup per workstation** | Support: Informa AI Team
>
> **Extension:** elysia-companion | **Version:** 0.1.0 | **License:** MIT

---

## Prerequisites

Before installing the extension, ensure:

1. **VS Code** is installed (version 1.85.0 or higher)
2. **Elysia CLI** is installed and working:
   ```powershell
   # Verify elysia-code is available
   elysia-code --version
   # Should output: 0.3.0 or similar
   ```

3. **Elysia CLI location** - Note where `elysia-code` is installed:
   - Windows: Usually `%USERPROFILE%\.local\bin\elysia-code.cmd`
   - macOS/Linux: Usually `~/.local/bin/elysia-code`

---

## Download the Extension

1. Obtain the latest `.vsix` file:
   - From the shared drive: `\\shared\ai-tools\elysia-companion-latest.vsix`
   - Or download from: [internal repository/link]

2. Save to your **Downloads** folder or a known location

---

## Installation Steps

### Option 1: VS Code UI (Recommended)

1. Open **VS Code**

2. Click on **Extensions** icon in the left sidebar (or press `Ctrl+Shift+X`)

3. Click the **"..."** (More Actions) menu at the top right

4. Select **"Install from VSIX..."**

5. Navigate to the downloaded `.vsix` file and select it

6. Wait for installation to complete

7. **Reload VS Code** when prompted (or press `Ctrl+Shift+P` → type "Developer: Reload Window")

### Option 2: Command Line

```powershell
# Windows PowerShell
& code --install-extension "C:\Users\$env:USERNAME\Downloads\elysia-companion-0.1.0.vsix"
```

```bash
# macOS/Linux
code --install-extension ~/Downloads/elysia-companion-0.1.0.vsix
```

---

## Configure the Extension

### Step 1: Detect Your Elysia Path

Find where `elysia-code` is installed on your machine:

```powershell
# Windows - PowerShell
$elysiaPath = Get-Command elysia-code -ErrorAction SilentlyContinue
if ($elysiaPath) {
    Write-Host "Found at: $($elysiaPath.Source)"
} else {
    # Check common locations
    $paths = @(
        "$env:USERPROFILE\.local\bin\elysia-code.cmd",
        "$env:USERPROFILE\.local\bin\elysia-code",
        "$env:LOCALAPPDATA\elysia-code\elysia-code.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            Write-Host "Found at: $p"
            break
        }
    }
}
```

```bash
# macOS/Linux
which elysia-code || find ~/.local/bin -name "elysia-code*" 2>/dev/null
```

**Copy the full path** found above (e.g., `C:\Users\johndoe\.local\bin\elysia-code.cmd`)

### Step 2: Configure VS Code Settings

1. Open VS Code Settings:
   - **File** → **Preferences** → **Settings** (or `Ctrl+,`)
   - Or press `Ctrl+Shift+P` → type "Preferences: Open Settings (UI)"

2. Search for: **"Elysia Usage"**

3. Locate **"Elysia Usage: Elysia Code Path"**

4. Enter the **full path** found in Step 1:

   **Windows Example:**
   ```
   C:\Users\johndoe\.local\bin\elysia-code.cmd
   ```

   **macOS/Linux Example:**
   ```
   /Users/johndoe/.local/bin/elysia-code
   ```

   > ⚠️ **Important for Windows**: Include `.cmd` extension if present

5. **Optional**: Adjust other settings:
   - **Warning Threshold**: 75% (default)
   - **Critical Threshold**: 90% (default)
   - **Refresh Interval**: 300000ms = 5 minutes (default)

### Alternative: Edit settings.json Directly

Press `Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)" and add:

```json
{
  "elysiaUsage.elysiaCodePath": "C:\\Users\\johndoe\\.local\\bin\\elysia-code.cmd",
  "elysiaUsage.warningThreshold": 75,
  "elysiaUsage.criticalThreshold": 90,
  "elysiaUsage.refreshInterval": 300000
}
```

> Replace the path with your actual Windows username and elysia-code location

---

## Verify Installation

### 1. Status Bar Should Appear

Look at the **bottom right** of VS Code. You should see:
```
✓ $XXX.XX / XX.X%
```

If you see:
- `$(loading~spin) Elysia...` - Wait 10-30 seconds for first fetch
- `$(error) Elysia` - Check configuration and see Troubleshooting below

### 2. Test the Dashboard

Click on the status bar item. A new tab should open showing:
- 📊 **Elysia Usage Dashboard**
- Usage Summary with visual progress bar
- Configuration details (version, model, workspace)

### 3. Check Output Logs

If something's wrong, check the logs:

1. Press `Ctrl+Shift+U` (Output panel)
2. Select **"Elysia Usage Tracker"** from the dropdown
3. Look for:
   - `Found elysia-code at: [path]`
   - `Executing: cmd.exe /c [path] --config`
   - `Command output received (XXX chars), exit code: 0`

---

## Troubleshooting

### ❌ "Failed to fetch Elysia usage details"

**Cause:** Extension cannot find `elysia-code`

**Solutions:**

1. **Verify elysia-code is working:**
   ```powershell
   # Open PowerShell/CMD and run:
   elysia-code --config
   ```
   If this fails, reinstall Elysia CLI first.

2. **Check the configured path:**
   - Open VS Code Settings (`Ctrl+,`)
   - Search "Elysia Code Path"
   - Ensure the path matches where `elysia-code` is installed
   - **Windows**: Must include `.cmd` extension (e.g., `elysia-code.cmd`)

3. **Use absolute path:**
   - Don't use relative paths
   - Don't use shortcuts like `~` or `%USERPROFILE%`
   - Example: `C:\Users\YOUR_USERNAME\.local\bin\elysia-code.cmd`

4. **Check permissions:**
   - Verify you have read/execute permissions on the elysia-code file

### ❌ "There is no data provider registered"

**Cause:** Outdated extension version

**Solution:** Reinstall the latest `.vsix` file

### ❌ Status bar stuck on loading

**Cause:** Command is failing silently

**Solution:**
1. Check Output logs (`Ctrl+Shift+U` → "Elysia Usage Tracker")
2. Look for error messages
3. Verify the path in settings is correct

### ❌ Dashboard opens but shows no data

**Cause:** Data parsing failed

**Solution:**
1. Check Output logs for parse errors
2. Run `elysia-code --config` manually and verify output format
3. Contact support if output format changed

---

## Uninstallation

If you need to remove the extension:

1. Open **Extensions** (`Ctrl+Shift+X`)
2. Find "Elysia Usage Tracker"
3. Click **Uninstall**
4. Reload VS Code

---

## For AI Assistants - Setup Checklist

When helping a user set up this extension, verify:

- [ ] User has VS Code 1.85+
- [ ] User has `elysia-code` installed and working
- [ ] User knows their Windows/macOS/Linux username
- [ ] User can locate `elysia-code` file path
- [ ] User configures `elysiaUsage.elysiaCodePath` with full absolute path
- [ ] Windows users include `.cmd` extension
- [ ] Extension shows data in status bar after reload
- [ ] Dashboard opens when clicking status bar

### Quick Template Response:

```
To set up Elysia Usage Tracker:

1. Install extension from .vsix file
2. Find your elysia-code location:
   Windows: C:\Users\YOURNAME\.local\bin\elysia-code.cmd
   Mac/Linux: ~/.local/bin/elysia-code

3. Open VS Code Settings (Ctrl+,)
4. Search "Elysia Code Path"
5. Enter the full path from step 2
6. Reload VS Code

The status bar should show your usage in the bottom right.
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-07-27 | Initial release |

---

**Maintained by:** Informa AI Team
**Extension:** elysia-companion
**License:** MIT
