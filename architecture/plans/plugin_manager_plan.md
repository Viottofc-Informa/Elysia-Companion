---
type: Plan
title: Plugin Manager — Caveman/Ponytail Toggle via Dashboard
description: BLAST plan for a "Plugins" tab in the Elysia Companion dashboard to manage elysia-code plugins via ~/.claude/settings.json
tags:
  - elysia
  - plugins
  - caveman
  - ponytail
  - plan
  - blast
generated: { by: "human:viottof", at: '2026-11-23T00:00:00Z' }
status: stable
---

# Plugin Manager — BLAST Plan

## 1. Blueprint (North Star)

### 1.1 Outcome
User toggles Caveman and Ponytail (mode + level) from the Elysia Companion
dashboard without hand-editing `~/.claude/settings.json`.

### 1.2 Scope (decided with user)
| Plugin | Control | Values |
|--------|---------|--------|
| Caveman | toggle + level | `caveman` / `manual` / `off` |
| Ponytail | toggle + level | `lite` / `full` / `ultra` / `off` |
| Tracing | **read-only badge** | shows `TRACE_TO_LANGSMITH` state |
| Shunt | **read-only badge** | "Managed by Elysia" |

Rationale: Shunt has no off-switch (CLI re-installs/re-populates on update,
`elysia-code.py` `install_shunt_plugin()`); Tracing is governance telemetry —
user chose read-only for both.

### 1.3 Source of Truth
`~/.claude/settings.json` → `env` block. Resolved via `os.homedir()` (cross-platform).

### 1.4 Delivery Payload
New **"Plugins" tab** in existing `detailsPanel.ts` Webview (reuses `initialTab`
mechanism). Not Usage tab, not separate window.

### 1.5 Behavioral Rules
- Edit writes only `CAVEMAN_DEFAULT_MODE` / `PONYTAIL_DEFAULT_MODE`; every other key untouched.
- After Apply: banner **"Restart Claude Code to apply"** (extension cannot restart
  Claude Code — separate process; user decision 1-A).
- Atomic write: temp file + rename. Never overwrite a corrupt/unparseable file —
  show error instead.
- Missing settings.json → tab shows "plugins not detected" state.

### 1.6 Data Schema (webview ↔ extension messages)
```jsonc
// → extension
{ "type": "loadPlugins" }
{ "type": "setPluginMode", "plugin": "caveman|ponytail", "mode": "off|caveman|manual|lite|full|ultra" }

// extension →
{ "type": "pluginsLoaded", "plugins": [
  { "id": "caveman",  "name": "Caveman",  "version": "4.1.0", "controllable": true,
    "mode": "caveman", "modes": ["caveman","manual","off"] },
  { "id": "ponytail", "name": "Ponytail", "version": "5.3.3", "controllable": true,
    "mode": "lite", "modes": ["lite","full","ultra","off"] },
  { "id": "tracing", "name": "Tracing", "controllable": false, "mode": "on" },
  { "id": "shunt",   "name": "Shunt",   "controllable": false, "mode": "on" }
]}
{ "type": "pluginModeSet", "success": true, "restartRequired": true, "error": null }
```

## 2. Link
No external APIs. File I/O to `~/.claude/settings.json` only. Validation step:
read real file, confirm round-trip parse/write preserves all keys (already
verified env block contents during research).

## 3. Architect (tasks)

1. **`src/settingsService.ts`** (new) — `readSettings()`, `getPluginStates()`,
   `setPluginMode(plugin, mode)` with atomic write. → verify: unit round-trip
   keeps unrelated keys byte-identical.
2. **`src/detailsPanel.ts`** — add `'plugins'` to tab union; handlers for
   `loadPlugins` / `setPluginMode`; render tab HTML (toggle + level select +
   2 read-only badges + restart banner). → verify: tab renders, message round-trip.
3. **`src/extension.ts`** — register `elysiaUsage.managePlugins` command
   (opens dashboard at plugins tab). → verify: command palette shows it.
4. **`package.json`** — declare `elysiaUsage.managePlugins` in
   `contributes.commands` (ADR-007: both places). → verify: clickable, palette-listed.
5. **`architecture/design.md`** — ADR-008 (plugin state lives in
   `~/.claude/settings.json`, edited directly; Tracing/Shunt read-only).
6. Compile + lint + manual smoke test against real settings.json.

## 4. Stylize
Match VS Code theme via CSS vars (ADR-003 pattern); toggles consistent with
existing model/compression controls.

## 5. Trigger
Bump version → `vsce package` → `.vsix` distribution (existing flow);
update CLAUDE.md + log.md.

## Risks
- **Corrupt settings.json** → never write; error state in UI.
- **Race with elysia-code --update** → CLI may rewrite env block on update;
  documented behavior, banner already tells user restart is needed.
