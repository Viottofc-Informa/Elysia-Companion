---
type: Documentation
title: Elysia Companion
resource: https://github.com/Viottofc-Informa/Elysia-Companion
tags:
  - elysia
  - vscode
  - extension
  - usage-tracker
  - model-management
  - compression-stats
  - informa
  - ai-tools
  - productivity
  - developer-tools
  - informa-connect
timestamp: '2026-10-09'
---

# Elysia Companion

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)](https://code.visualstudio.com/)
[![Informa](https://img.shields.io/badge/Informa-Design%20System-indigo.svg)](https://www.informa.com/)
[![Version](https://img.shields.io/badge/version-0.2.0-green.svg)](CHANGELOG.md)
[![Download](https://img.shields.io/badge/Download-VSIX-orange.svg)](releases/elysia-companion-0.2.0.vsix)

A VS Code extension that provides comprehensive management for the [Elysia](https://elysia.informa.com/) code assistant, including **usage tracking**, **compression stats**, **model switching**, **service control**, and **privacy mode management** — following the official **Informa Design System**.

> **Latest Release:** v0.2.0 — [Download VSIX](releases/elysia-companion-0.2.0.vsix) | New: Compression Stats tab with detailed metrics!

---

## Overview

Elysia Companion integrates directly with your VS Code workflow to provide:

- **📊 Usage Monitoring**: Real-time tracking of Elysia credit consumption
- **📉 Compression Stats**: Detailed metrics — tokens saved, USD saved, top projects/models
- **🤖 Model Management**: Easy switching between AI models (Claude, GPT, Kimi, etc.)
- **🔒 Private Mode**: Toggle between Standard (LLM cloud) and Private (local only) modes
- **🚀 Service Control**: Restart compression service when needed
- **🎨 Informa Design**: Official Informa color palette and typography
- **🌓 Dual Theme**: Full Light & Dark mode support with Informa colors
- **🚦 Visual Status**: Color-coded indicators (🟢🟡🔴) for quick assessment
- **📑 Tabbed Dashboard**: Usage tab for daily tasks, Compression tab for analytics

---

## Features

### 🔒 Private Mode Toggle

Quickly switch between Standard and Private modes:
- **🔓 Standard Mode**: Full LLM cloud features
- **🔒 Private Mode**: Local-only processing for sensitive work
- Status bar icon changes to reflect current mode
- Dashboard button for easy toggle
- Auto-refreshes panel after mode change

### 🎨 Informa Design System

Official Informa branding applied throughout:
- **Primary**: Indigo `#002244` (light) / Light Blue `#AAE6FF` (dark)
- **Accent**: Sky `#28B4FF` for interactive elements
- **Typography**: Aleo (headings), Open Sans (body)
- **Semantic Colors**: Mint, Saffron, Coral for status
- **Spacing**: 8px base scale for applications

### 🚦 Usage Tracking

Real-time status bar display showing:
- Current usage: `$X.XX / XX.X%`
- Lighthouse indicators based on consumption thresholds:
  - 🟢 **Green** (< 45%): Healthy usage
  - 🟡 **Yellow** (45-85%): Warning level
  - 🔴 **Red** (> 85%): Critical - consider reducing usage

### 🤖 Model Management

Dropdown selector in dashboard allowing quick switches between:
- OpenAI models (GPT-4, GPT-4o, etc.)
- Anthropic models (Claude Sonnet, Claude Haiku, etc.)
- Kimi models (kimi-k2.5, etc.)
- Local models (llama, mistral, etc.)

### 📉 Compression Stats

A dedicated **Compression** tab showing detailed metrics from `elysia-code --compression-stats --json`:

**Status & Mode**
- Service status (enabled/disabled) and port
- Active compression strategy

**Session Savings**
- Tokens saved in the current session
- USD saved and total input cost
- Requests processed

**Lifetime Savings**
- Cumulative tokens saved (all time)
- Cumulative USD saved and total spend
- Total requests processed

**Top Projects** (collapsible)
- Top 5 projects by tokens saved, with request counts, savings %, and USD

**Top Models** (collapsible)
- Top 5 models by compression efficiency

**Recent Requests** (collapsible)
- Last 5 requests with model, original tokens → optimized tokens, tokens saved, and applied transforms

Click the **Compression** status bar icon to open the dashboard directly on this tab.

### 🚀 Service Control

One-click restart of the Elysia compression service when experiencing connectivity issues.

### 📊 Detailed Dashboard

Two tabs, each with its own focus:

**Usage tab:**
- Model selector (top) for quick switching
- Visual progress bar with usage percentage
- Remaining budget calculation
- Configuration details (version, workspace, config ID, compression state)
- Private Mode toggle, LangSmith status
- Actions panel (Refresh, Restart, Settings)

**Compression tab:**
- Status cards, Session and Lifetime savings
- Collapsible Top Projects, Top Models, Recent Requests
- Actions panel (Refresh Stats, Restart)

---

## Installation

### Quick Install (Latest Release)

**Download:** [elysia-companion-0.2.0.vsix](releases/elysia-companion-0.2.0.vsix)

```powershell
# Download and install in one command
Invoke-WebRequest -Uri "https://github.com/Viottofc-Informa/Elysia-Companion/raw/main/releases/elysia-companion-0.2.0.vsix" -OutFile "elysia-companion-0.2.0.vsix"
code --install-extension elysia-companion-0.2.0.vsix
```

### From VSIX (Recommended for Teams)

1. Download the latest `.vsix` from [releases/](releases/)
2. Install via command line:
   ```powershell
   code --install-extension elysia-companion-0.2.0.vsix
   ```
3. Or drag-and-drop the `.vsix` file into VS Code Extensions panel

### From VS Code Marketplace

_Coming soon — not yet published_ ⏳

### From Source

```bash
git clone https://github.com/Viottofc-Informa/Elysia-Companion.git
cd elysia-companion
npm install
npm run compile
npx vsce package --no-dependencies
code --install-extension elysia-companion-0.2.0.vsix
```

---

## Configuration

All settings available via VS Code settings (`Ctrl+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `elysiaUsage.enableTracking` | `true` | Enable/disable usage tracking |
| `elysiaUsage.refreshInterval` | `300000` | Auto-refresh interval (ms) |
| `elysiaUsage.warningThreshold` | `45` | Yellow lighthouse threshold |
| `elysiaUsage.criticalThreshold` | `85` | Red lighthouse threshold |
| `elysiaUsage.showDollarAmount` | `true` | Show $ amount in status bar |
| `elysiaUsage.showPercentage` | `true` | Show percentage in status bar |
| `elysiaUsage.elysiaCodePath` | `elysia-code` | Path to elysia-code executable |

### Example User Settings

```json
{
  "elysiaUsage.enableTracking": true,
  "elysiaUsage.refreshInterval": 300000,
  "elysiaUsage.warningThreshold": 45,
  "elysiaUsage.criticalThreshold": 85,
  "elysiaUsage.showDollarAmount": true,
  "elysiaUsage.showPercentage": true,
  "elysiaUsage.elysiaCodePath": "C:\\Users\\johndoe\\.local\\bin\\elysia-code.cmd"
}
```

---

## Commands

Available via Command Palette (`Ctrl+Shift+P`):

| Command | ID | Description |
|---------|-----|-------------|
| `Elysia Usage: Refresh Usage Data` | `elysiaUsage.refresh` | Force refresh usage information |
| `Elysia Usage: Show Detailed Usage` | `elysiaUsage.showDetails` | Open dashboard on **Usage** tab |
| `Elysia Usage: Show Compression Stats` | `elysiaUsage.showCompressionDetails` | Open dashboard on **Compression** tab |
| `Elysia Usage: Restart Compression` | `elysiaUsage.restartCompression` | Restart compression service |
| `Elysia Usage: Toggle Private Mode` | `elysiaUsage.togglePrivateMode` | Switch between Private/Standard |
| `Elysia Usage: Get Models` | `elysiaUsage.getModels` | List available models |
| `Elysia Usage: Change Model` | `elysiaUsage.changeModel` | Switch AI model |
| `Elysia Usage: Open Settings` | `elysiaUsage.openSettings` | Configure extension |

### Status Bar Click Actions

| Icon | Click Action |
|------|--------------|
| `🟢 $117.45 / 58.7%` | Opens dashboard on **Usage** tab |
| `🟢 Compression` | Opens dashboard on **Compression** tab |
| `🔓 Standard` / `🔒 Private` | Toggles private mode |

---

## Requirements

- **VS Code**: 1.85.0 or higher
- **elysia-code**: CLI tool installed and accessible
  - Windows: `%USERPROFILE%\.local\bin\elysia-code.cmd`
  - macOS/Linux: `~/.local/bin/elysia-code`

---

## Troubleshooting

### Extension Not Showing in Status Bar

1. Verify tracking is enabled: `elysiaUsage.enableTracking: true`
2. Test cli: `elysia-code --config` (should return configuration)
3. Check Output channel: `View → Output → Elysia Companion`

### "Failed to change model" Error

1. Verify `elysia-code` path is correct in settings
2. Check if model name exists: `elysia-code --models`
3. Try manual command: `elysia-code --model "model-name"`
4. Check Output channel for detailed error logs

### Service Restart Fails

1. Check if `elysia-code --compression-disable` works
2. Ensure port 8787 is not blocked by firewall
3. Restart VS Code and try again

---

## Architecture

```
elysia-companion/
├── src/
│   ├── extension.ts          # Entry point, command registration
│   ├── elysiaService.ts      # Core service, CLI communication, parsing ★
│   ├── statusBarManager.ts   # Status bar UI management
│   └── detailsPanel.ts       # Webview dashboard (HTML/JS/CSS)
├── out/                      # Compiled JavaScript
├── releases/                 # Packaged VSIX files
│   └── elysia-companion-0.2.0.vsix
├── architecture/
│   ├── design.md             # Architecture decisions (ADRs)
│   └── spec.md               # Data contracts
├── tools/
│   └── build_vscode_extension.py  # Build + package (Python)
├── build-release.ps1         # Build + package script (PowerShell)
├── build-release.sh          # Build + package script (Bash)
├── build-and-package.ps1     # Build + package + install (PowerShell)
├── build-and-package.cmd     # Build + package + install (Command)
├── README.md                 # This file
├── RELEASE_NOTES.md          # Release notes for latest version
├── CHANGELOG.md              # Version history
├── CLAUDE.md                 # Project map (BLAST Phase 0)
├── log.md                    # Development log (OKF)
└── package.json              # Extension manifest
```

### Elysia CLI Commands Used

| CLI Command | Used By | Purpose |
|-------------|---------|---------|
| `elysia-code --config` | Usage Tracking | Fetch live usage and configuration |
| `elysia-code --models` | Model Selector | List available models |
| `elysia-code --model "<name>"` | Model Selector | Switch active model |
| `elysia-code --private <bool>` | Private Mode | Toggle private/standard mode |
| `elysia-code --compression-disable` | Restart Service | Stop compression proxy |
| `elysia-code --compression-enable` | Restart Service | Start compression proxy |
| `elysia-code --compression-stats --json` | Compression Tab | Fetch detailed compression metrics |

---

## Development

### Build

```bash
npm install
npm run compile
```

### Debug

```bash
# Open in VS Code and press F5
# Or from terminal:
code --extensionDevelopmentPath="."
```

### Package

```bash
# Using npm scripts
npm run package           # Creates .vsix in root
npm run package:install   # Creates .vsix and installs it

# Or manually
npm install -g @vscode/vsce
npx vsce package --no-dependencies
```

### Build Scripts

```powershell
# PowerShell - full build + release prep
.\build-release.ps1

# PowerShell - build + package + prompt to install
.\build-and-package.ps1 -Install
```

```cmd
build-and-package.cmd install
```

```bash
# Python - build + package (+ optional install)
python tools/build_vscode_extension.py --install
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## License

MIT - See [LICENSE](LICENSE)

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/Viottofc-Informa/Elysia-Companion/issues).

---

**Maintained by:** Informa AI Team  
**Publisher:** Informa PLC  
**Version:** 0.2.0  
**Last Updated:** 2026-10-09  
**License:** MIT

---

## 🏷️ GitHub Topics / Tags

When configuring your GitHub repository, add these topics:

`elysia` `vscode-extension` `ai-assistant` `code-assistant` `usage-tracker` `model-management` `private-mode` `informa` `informa-connect` `developer-tools` `productivity` `typescript` `anthropic-claude` `openai-gpt` `kimi-ai`

---

## 🌐 Links

- [Elysia Platform](https://elysia.informa.com/)
- [Informa Website](https://www.informa.com/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Repository](https://github.com/Viottofc-Informa/Elysia-Companion)
- [Report Issues](https://github.com/Viottofc-Informa/Elysia-Companion/issues)
- [Latest Release](https://github.com/Viottofc-Informa/Elysia-Companion/releases)
