# Release Notes v0.3.2 — Model Selector with Metadata

**Release Date:** 2026-11-23  
**Download:** [elysia-companion-0.3.2.vsix](releases/elysia-companion-0.3.2.vsix)

---

## 🎯 What's New

### 🤖 Rich Model Selector with Metadata

Every row in the Usage tab's model dropdown now shows **two lines** — the model
name plus a metadata line with context window and pricing:

```
kimi-k2.7-code
262K ctx · $3.30 in / $16.50 out  ⓘ
```

The `ⓘ` info button opens a detail tooltip with:
- **"Best for"** description (e.g., "General-purpose coding & long-form tasks")
- **Exact context window** and auto-compact threshold
- **Full input/output pricing**, including tiered pricing for models that
  charge differently below/above a prompt-length threshold

The tooltip opens on hover or keyboard focus, flips above the row when viewport
height is short, and closes on scroll. Metadata covers all 13 gateway models;
a model returned by `elysia-code --models` but not in the catalog still renders
and stays selectable — just without the metadata line or info button.

### 📋 Provenance Footer

The dropdown footer now credits the metadata source and verification date:
`Details from pilots.ai.informa.com/elysia-code/ · verified 2026-11-23`.

---

## 🔧 Changed

- Model selector row height increased (2 lines + info button)
- Dropdown `max-height` raised from `300px` to `min(60vh, 520px)` to fit taller rows
- Dropdown footer is now `position: sticky` so it's always visible

---

## 🐛 Fixed

- **Clicking a model did nothing** (regression caught in testing): inline `onclick`
  handlers were referencing an IIFE-scoped variable invisible to the global scope
  where the browser evaluates them. Now routed through a `window`-level function
  with index-based resolution.
- **Prototype-key models**: a gateway model named `toString`/`constructor`/`__proto__`
  would have rendered a literal `"undefined"` metadata line and thrown in the
  tooltip. Now guarded by `hasOwnProperty`.
- **Tooltip off-screen in narrow panels**: the left-edge clamp could push the tooltip
  to negative coordinates in a sidebar narrower than ~300px. Now clamped low-to-high.
- **VSIX packaging leaks**: build scripts (`.ps1`/`.cmd`/`.sh`), source maps
  (`.js.map`), and legacy mockup HTML files were being bundled — ~11 extra files
  totaling ~125 KB. Excluded in `.vscodeignore`.

---

## 📦 Assets

| File | Description | Size |
|------|-------------|------|
| [elysia-companion-0.3.2.vsix](releases/elysia-companion-0.3.2.vsix) | VS Code Extension Package | ~56 KB |

---

## 🔧 Installation

```powershell
code --install-extension elysia-companion-0.3.2.vsix
```

Or install via VS Code:
1. Open Extensions panel (`Ctrl+Shift+X`)
2. Click "..." (More Actions) → "Install from VSIX"
3. Select `elysia-companion-0.3.2.vsix`

---

## 🔄 Upgrade Notes

**From v0.3.1:** Seamless upgrade. Reload the VS Code window after installation.
If you installed the earlier `0.3.2` pre-fix build, uninstall it first
(`code --uninstall-extension fernando.viotto.elysia-companion`), then install
this one.

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete version history.
