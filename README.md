---
type: Documentation
title: Elysia Companion
resource: https://github.com/informa/elysia-companion
tags:
  - elysia
  - vscode
  - extension
  - usage-tracker
  - model-management
  - informa
  - ai-tools
  - productivity
  - developer-tools
  - informa-connect
timestamp: '2026-07-30'
---

# Elysia Companion

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)](https://code.visualstudio.com/)
[![Informa](https://img.shields.io/badge/Informa-Design%20System-indigo.svg)](https://www.informa.com/)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](CHANGELOG.md)

A VS Code extension that provides comprehensive management for the [Elysia](https://elysia.informa.com/) code assistant, including usage tracking, model switching, service control, and privacy mode management — following the official **Informa Design System**.

---

## Overview

Elysia Companion integrates directly with your VS Code workflow to provide:

- **📊 Usage Monitoring**: Real-time tracking of Elysia credit consumption
- **🤖 Model Management**: Easy switching between AI models (Claude, GPT, Kimi, etc.)
- **🔒 Private Mode**: Toggle between Standard (LLM cloud) and Private (local only) modes
- **🚀 Service Control**: Restart compression service when needed
- **🎨 Informa Design**: Official Informa color palette and typography
- **🌓 Dual Theme**: Full Light & Dark mode support with Informa colors
- **🚦 Visual Status**: Color-coded indicators (🟢🟡🔴) for quick assessment

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

### 🚀 Service Control

One-click restart of the Elysia compression service when experiencing connectivity issues.

### 📊 Detailed Dashboard

Click status bar to see:
- Visual progress bar with usage percentage
- Remaining budget calculation
- Configuration details (version, model, workspace)
- LangSmith status
- Actions panel (Refresh, Restart, Settings, Change Model)

---

## Installation

### From VSIX (Recommended for Teams)

```powershell
code --install-extension elysia-companion-0.1.0.vsix
```

### From VS Code Marketplace

1. Open VS Code Extensions (`Ctrl+Shift+X`)
2. Search: "Elysia Companion"
3. Click Install

### From Source

```bash
git clone https://github.com/informa/elysia-companion.git
cd elysia-companion
npm install
npm run compile
code --install-extension elysia-companion-0.1.0.vsix
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

| Command | Description |
|---------|-------------|
| `Elysia Companion: Refresh Usage Data` | Force refresh usage information |
| `Elysia Companion: Show Dashboard` | Open detailed usage dashboard |
| `Elysia Companion: Restart Service` | Restart compression service |
| `Elysia Companion: Change Model` | Switch AI model |
| `Elysia Companion: Open Settings` | Configure extension |

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
│   ├── elysiaService.ts      # Core service, cli communication
│   ├── statusBarManager.ts   # Status bar UI management
│   └── detailsPanel.ts       # Webview dashboard
├── out/                      # Compiled JavaScript
├── architecture/
│   ├── design.md             # Architecture decisions
│   └── spec.md               # Data contracts
├── README.md                 # This file
├── CHANGELOG.md              # Version history
└── package.json              # Extension manifest
```

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
npm install -g vsce
vsce package
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

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/informa/elysia-companion/issues).

---

**Maintained by:** Informa AI Team  
**Publisher:** Informa PLC  
**Version:** 0.1.0  
**Last Updated:** 2026-07-30  
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
- [Report Issues](https://github.com/informa/elysia-companion/issues)
