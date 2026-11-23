# Release Notes v0.3.1 — Plugin Manager

**Release Date:** 2026-11-23  
**Download:** [elysia-companion-0.3.1.vsix](releases/elysia-companion-0.3.1.vsix)

---

## 🎯 What's New

### 🧩 Plugins Tab

New **Plugins** tab in the dashboard to manage elysia-code plugins without
hand-editing `~/.claude/settings.json`:

- **Caveman** — toggle + level selector (`caveman` / `manual` / `off`)
- **Ponytail** — toggle + level selector (`lite` / `full` / `ultra` / `off`)
- **Tracing** and **Shunt** — shown as read-only "Managed" badges (governance /
  always-on; no user toggle)
- Post-save banner with a **🚀 Restart** button that restarts the Elysia session
  (compression + Claude Code) so changes take effect

Plugin state is read from and written to the `env` block of
`~/.claude/settings.json` via the new `SettingsService` — writes are atomic and
only ever touch `CAVEMAN_DEFAULT_MODE` / `PONYTAIL_DEFAULT_MODE`, preserving every
other key (tokens, certificates, LangSmith config).

### New Command

- `Elysia Usage: Manage Plugins` — opens the dashboard directly on the Plugins tab

---

## 🔄 Changed

### Compression Restart

`restartCompression()` now uses `elysia-code --compression-restart` — a single
atomic command that performs disable+enable internally. The legacy
`--compression-disable` → `--compression-enable` two-step sequence was removed
(the `--compression-disable` flag is being retired from the CLI). Falls back to
`--compression-enable` on older CLIs. This fixes the Restart button on both the
Usage and Plugins tabs.

---

## 📦 Assets

| File | Description | Size |
|------|-------------|------|
| [elysia-companion-0.3.1.vsix](releases/elysia-companion-0.3.1.vsix) | VS Code Extension Package | ~72 KB |

---

## 🔧 Installation

```powershell
# VS Code
code --install-extension elysia-companion-0.3.1.vsix

# VS Code Insiders
code-insiders --install-extension elysia-companion-0.3.1.vsix
```

Or install via VS Code:
1. Open Extensions panel (Ctrl+Shift+X)
2. Click "..." (More Actions) → "Install from VSIX"
3. Select `elysia-companion-0.3.1.vsix`

---

## 🔄 Upgrade Notes

**From v0.2.x:** Seamless upgrade. Reload the VS Code window after installation.
Plugin settings are read live from `~/.claude/settings.json` — no migration needed.

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete version history.
