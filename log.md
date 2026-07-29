# Elysia Companion — Development Log

> Chronological change history following OKF convention  
> Format: ## YYYY-MM-DD — Description

---

## 2026-07-29 — Project renamed to "Elysia Companion"

### Changed
- **Extension name**: "Elysia Usage Tracker" → "Elysia Companion"
- **package.json**: Updated `name`, `displayName`, and `description`
- **README.md**: Replaced with OKF-compliant documentation
- **CLAUDE.md**: Created comprehensive project map
- **SETUP_GUIDE.md**: Added YAML frontmatter, updated references

### Rationale
Extension now does much more than just tracking:
- Usage monitoring (original)
- Model management (new)
- Service control (new)
- Dashboard with actions (new)

Name better reflects the expanded functionality.

---

## 2026-07-29 — Fixed model change command execution

### Problem
`changeModel()` returned `false` despite successful CLI execution.

### Root Cause
`executeCommand()` used `cp.spawn()` with manual argument parsing (`split(' ').slice(1)`) which broke when model names contained dots or special characters.

Ex: `--model "zai.glm-5"` became `--model zai.glm-5` (unquoted) → shell interpreted as multiple arguments.

### Solution
Switched `changeModel()` to use `execAsync()` (already imported) which:
- Lets Windows shell handle quoting
- No manual argument splitting
- More reliable for single-shot commands

### Changed
- **src/elysiaService.ts**: `changeModel()` now uses `execAsync` instead of `executeCommand`
- Added detailed logging (`hasOk`, `hasUpdated`, `hasModelName`)

### Verification
✅ Successfully changed to `zai.glm-5`, `claude-sonnet-4-6`, etc.

---

## 2026-07-29 — Added model selector feature

### Added
- **Dashboard section**: "🤖 AI Model" with dropdown
- **Commands**: `elysiaUsage.getModels`, `elysiaUsage.changeModel`
- **UI**: Dropdown showing all available models with "active" badge
- **Confirmation dialog**: Shows old → new model before applying
- **Auto-restart**: Model change triggers compression restart

### Technical
- New methods: `getModels()`, `parseModelsOutput()`, `changeModel()`
- WebView ↔ Extension communication via `postMessage`
- CSS animations for dropdown and modal

---

## 2026-07-29 — Fixed compression restart verification

### Problem
Restart failed with "Failed to enable compression" even though it worked.

### Root Cause
Elysia output has **two spaces** between "OK" and "Compression":
```
OK  Compression enabled   ← 2 spaces!
```

Code checked for:
```typescript
output.includes('OK Compression enabled')  // 1 space — never matches!
```

### Solution
Changed verification to check substrings without the "OK  " prefix:
- `'Compression disabled'` instead of `'OK  Compression disabled'`
- `'Compression enabled'` instead of `'OK  Compression enabled'`

### Changed
- **src/elysiaService.ts**: Fixed `restartCompression()` verification logic

---

## 2026-07-28 — Renamed "Restart Compression" to "Restart"

### Changed
- Button label: "Restart Compression" → "Restart"
- Messages: Removed "compression" references for brevity
- Notification: "Elysia compression restarted" → "Elysia restarted"

### Rationale
Users understand "Restart" resets the service; full name was redundant.

---

## 2026-07-27 — Added Restart functionality

### Added
- **Button**: "🚀 Restart" in dashboard
- **Command**: `elysiaUsage.restartCompression`
- **Feature**: Executes disable → enable sequence
- **Progress notification**: Shows steps in UI

### Technical
```typescript
await executeCommand('elysia-code --compression-disable');
await executeCommand('elysia-code --compression-enable');
```

---

## 2026-07-27 — Fixed status bar loading stuck

### Problem
Status bar stayed on `$(loading~spin) Elysia...` indefinitely.

### Root Cause
`refresh()` had check `if (this.isLoading) return;` which prevented refresh if state was "loading".

### Solution
Removed the early return guard; now forces refresh even when already loading.

---

## 2026-07-27 — Fixed WebView data provider error

### Problem
Sidebar showed "There is no data provider registered that can provide view data."

### Solution
Removed `viewsContainers` and `views` from `package.json` — we didn't implement data providers for them; dashboard via WebView is sufficient.

---

## 2026-07-27 — Fixed dashboard icons showing as text

### Problem
Tooltips showed literal `$(refresh)` and `$(gear)` instead of icons.

### Solution
Replaced VS Code icon syntax (`$(icon)`) with emojis (`🔄`, `⚙️`) in tooltip Markdown — VS Code icons don't render in WebView tooltips.

---

## 2026-07-27 — Created lighthouse threshold system

### Changed
- **Green**: < 45% (was < 75%)
- **Yellow**: 45-85% (was 75-90%)
- **Red**: > 85% (was > 90%)

### Visual
Status bar now uses emoji faróis:
- 🟢 Healthy
- 🟡 Warning
- 🔴 Critical

---

## 2026-07-27 — VS Code Extension v0.1.0 Initial Release

### Features
- Real-time usage display in status bar
- Auto-refresh every 5 minutes
- Color-coded status (initial thresholds)
- Detailed dashboard with WebView
- Configuration options
- Elysia CLI integration

### Technical
- TypeScript
- VS Code Extension API
- `child_process.spawn/exec` for CLI
- CSS variables matching VS Code theme

---

## Maintenance Guidelines

1. **Add entries** for every meaningful change
2. **Follow format**: Date — Summary / Changed / Rationale
3. **Link to files** mentioned (e.g., `src/elysiaService.ts`)
4. **Include root cause** for bug fixes
5. **Mark verification** when tested

---

**Maintained by:** Informa AI Team  
**License:** MIT
