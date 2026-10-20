# Release Notes v0.2.1 — CLI v0.3.10 Compatibility

**Release Date:** 2026-10-20  
**Download:** [elysia-companion-0.2.1.vsix](releases/elysia-companion-0.2.1.vsix)

---

## 🎯 What's New

### Enhanced Config Support

Full compatibility with **Elysia CLI v0.3.10** new `--config` output fields:

#### 🤖 Model Information Section

New card in Usage tab displaying model specifications:
- **Context Window:** Maximum token context (e.g., "1048576 tokens")
- **Auto-Compact:** Threshold for automatic compaction (e.g., "900000 tokens")
- **Input / 1M tokens:** Input pricing (e.g., "$3.30 USD")
- **Output / 1M tokens:** Output pricing (e.g., "$16.50 USD")

#### 📅 Quota Information

Enhanced Usage section with expiry tracking:
- **Reset Frequency:** When usage resets (e.g., "Monthly")
- **Quota Expires:** Expiry date for current quota period (e.g., "2026-12-31")

#### 📄 Compression Log

New card displaying the path to compression log file when available.

---

## 🐛 Bug Fixes

### UI Improvements
- **Model Information** card repositioned below Usage Summary for better logical flow
- All new fields gracefully degrade when running against older CLI versions

---

## 📦 Assets

| File | Description | Size |
|------|-------------|------|
| [elysia-companion-0.2.1.vsix](releases/elysia-companion-0.2.1.vsix) | VS Code Extension Package | ~66 KB |

---

## 🔧 Installation

```bash
# VS Code
## 2026-10-20 — AI Workspace"\elysia-tracker-usage\elysia-companion-0.2.1.vsix

# VS Code Insiders
code-insiders --install-extension elysia-companion-0.2.1.vsix
```

Or install via VS Code:
1. Open Extensions panel (Ctrl+Shift+X)
2. Click "..." (More Actions) → "Install from VSIX"
3. Select `elysia-companion-0.2.1.vsix`

---

## 🔄 Upgrade Notes

**From v0.2.0:** Seamless upgrade. Reload VS Code window after installation.

**From v0.1.x:** Configuration settings preserved. New compression features will be auto-discovered.

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete version history.
