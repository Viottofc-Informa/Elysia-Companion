# Elysia Companion — Development Log

> Chronological change history following OKF convention  
> Format: ## YYYY-MM-DD — Description

---

## 2026-10-22 — Repository cleanup: reset from v0.3.0 attempt to stable v0.2.1

### Problem
Local repository had diverged from remote with:
- Version mismatch: package.json at 0.3.0, but remote was 0.2.1
- Corrupted files: `detailsPanel.ts.corrupted`, debug plan markdown
- Uncommitted changes in log.md and elysiaService.ts
- Local commits ahead of remote (v0.3.0 attempt that failed)

### Solution
Performed clean reset to stable v0.2.1:
1. Created backup at `backup_v0.3.0_attempt/` with corrupted files and local modifications
2. Discarded local changes: `git checkout -- log.md src/elysiaService.ts`
3. Removed corrupted files: `detailsPanel.ts.corrupted`, `elysia-companion-v0.3.0-debug-plan.md`
4. Reset to v0.2.1 tag: `git reset --hard v0.2.1`
5. Synced with remote: `git pull origin main`

### Result
- Repository now at stable v0.2.1 (78a34ef)
- Clean working tree, synchronized with origin/main
- Backup preserved for reference if needed

---

## 2026-10-20 — Added new CLI v0.3.10 config fields

### Context
Elysia CLI v0.3.10 introduced new fields in `--config` output that were not being captured or displayed.

### New Fields Captured
- **Model Info**: `context` (1048576 tokens), `autoCompact` (900000 tokens), `inputPrice` ($3.30 USD), `outputPrice` ($16.50 USD)
- **Usage Info**: `resets` (Monthly), `expires` (2026-12-31)
- **Compression Info**: `compressionLog` (path to log file)

### Changed
- **src/elysiaService.ts**: Extended `ElysiaConfig` interface (lines 19-27), added parsing logic for 7 new fields following existing regex pattern
- **src/detailsPanel.ts**: Added conditional display sections — Model Information card, Quota information, Compression Log path — all gracefully degrade if data unavailable

### Backwards Compatibility
All new fields are optional (`?`) in the interface; extension works with older CLI versions that don't output these fields.

---

## 2026-10-13 — Fixed non-clickable status bar items + full documentation audit

### Problem
The Compression status bar item was not selectable — no hover highlight, no click handler —
while the Usage item worked normally.

### Root Cause
`elysiaUsage.showCompressionDetails` was registered at runtime via `vscode.commands.registerCommand`
and assigned to `compressionStatusItem.command`, but it was **never declared** in
`package.json` → `contributes.commands`. VS Code validates status bar item commands against the
manifest; an undeclared command leaves the item non-interactive and absent from the Command Palette.

The same defect affected `elysiaUsage.togglePrivateMode`.

### Solution
Declared both commands in `package.json` → `contributes.commands` with titles, categories, and icons:
- `elysiaUsage.showCompressionDetails` — "Show Compression Stats" (`$(dashboard)`)
- `elysiaUsage.togglePrivateMode` — "Toggle Private Mode" (`$(lock)`)

### Changed
- **package.json**: Added 2 missing command declarations
- **README.md**: Commands table (all 8 commands with IDs), new Compression Stats feature section,
  status bar click actions table, expanded Architecture tree, Elysia CLI command reference,
  build scripts section, fixed repo links (`informa/elysia-companion` → `Viottofc-Informa/Elysia-Companion`)
- **CLAUDE.md**: Updated date/status to v0.2.0; added §2.4 CompressionStats schemas,
  §2.5 Registered Commands, §2.6 Status Bar Items; new ADR-003 documenting this root cause;
  updated File Structure; added §10 Release Process
- **architecture/spec.md**: Added full Compression Stats contract (JSON paths → typed model,
  parsing rules, type definitions, UI presentation table); rewrote Commands, Status Bar, and
  WebView message contracts; added `initialTab` documentation
- **SETUP_GUIDE.md**: Version 0.1.0 → 0.2.0; corrected thresholds (75/90 → 45/85);
  replaced placeholder download link with real GitHub URLs; documented 3 status bar items;
  added troubleshooting for compression tab and non-clickable items
- **CHANGELOG.md**: Added Fixed section with the ADR-007 root cause
- **RELEASE_NOTES.md**: Documented the status bar fix
- **architecture/index.md**: Updated resource URL and timestamp

### Cleanup
- **src/extension.ts**: Removed dead command `elysiaUsage.loadCompressionStats` (registered but never invoked —
  compression stats are fetched through the `loadCompressionStats` WebView message, not the command bus).
  Removed the now-unused `CompressionStats` import.

### Verification
✅ `npm run compile` — no errors
✅ Command consistency: declared (`package.json`) == registered (`extension.ts`) — 8/8 IDs match

---

## 2026-08-03 — Handle "Used: -" state when monthly usage resets

### Problem
At the start of a new billing month, `elysia-code --config` returns:
```
Used       : -
            [-] -
```
The extension returned `null` from `fetchConfig()` and the UI went blank.

### Root Cause
The `parseConfigOutput()` parser used a regex that only matched `$X.XX / $Y.YY`.  
When the CLI emits `-`, the match failed → `usedAmount` and `totalAmount` stayed `undefined` → validation rejected the config → `fetchConfig()` returned `null`.

### Solution
Added a second branch in the `Used` parser:
```typescript
} else if (trimmed.match(/:\s*-/)) {
  config.usedAmount = 0;
  config.totalAmount = 0;
  config.isResetState = true;
}
```
- New `isResetState: boolean` field on `ElysiaConfig`.
- Percentage defaults to `0` (instead of crashing on `0/0`).
- Validation accepts the reset state (0 is a valid amount, not `undefined`).

### UI Changes
| Location | Before | After |
|---|---|---|
| Status bar | blank / loading forever | `🟢 ↺ Reset` |
| Status bar tooltip | broken | `Used: Month reset — no usage yet` |
| Dashboard badge | — | `Month Reset` badge |
| Dashboard amount | `$0.00` | `↺ Month Reset` |
| Dashboard progress text | `0.0% of $0.00` | `No usage yet this month` |

### Changed
- **src/elysiaService.ts**: `ElysiaConfig` interface + `parseConfigOutput()` + validation
- **src/statusBarManager.ts**: `updateDisplay()` + `buildTooltip()` + refresh log
- **src/detailsPanel.ts**: `getWebviewContent()` status logic + usage card HTML

### Verification
✅ `npx tsc --noEmit` — no errors

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

## 2026-10-09 — Added Compression Stats tab with detailed metrics

### Added
- **New tab "Compression"** in dashboard with 3-card layout (Status, Session Savings, Lifetime Savings)
- **Top Projects section** — collapsible table showing projects with most tokens saved
- **Top Models section** — collapsible table showing models with most compression
- **Recent Requests section** — collapsible cards showing last 5 requests with details
- **Compression icon click handler** — Clicking the Compression status bar icon now opens dashboard directly on Compression tab
- **New interfaces**: `CompressionStats`, `CompressionSession`, `CompressionLifetime`, `ProjectStats`, `ModelStats`, `RecentRequest`
- **New service method**: `fetchCompressionStats()` — calls `elysia-code --compression-stats --json`
- **Helper functions**: `formatNumber()`, `formatTime()` for displaying large numbers and timestamps

### Changed
- **Dashboard reorganized** into 2 tabs: **Usage** and **Compression**
- **Usage tab** contains: Model selector (top), Usage Summary, Configuration, Actions (bottom)
- **Compression tab** contains: Status cards, Session/Lifetime savings, collapsible tables
- **Tab navigation** added with active state styling
- Actions available in both tabs for convenience

### Technical
- **Stat cards**: Responsive grid with hover effects (lift + shadow)
- **Collapsible sections**: Chevron rotation, smooth height transition (max-height technique)
- **Data tables**: Striped rows, hover highlight, truncated long text
- **Request cards**: Grid of metrics showing original → optimized → saved
- **Tab switching**: `initialTab` parameter in `DetailsPanel.show()` for programmatic tab selection

### Data Pipeline
```
CLI: elysia-code --compression-stats --json
  ↓
Service.fetchCompressionStats()
  ↓
Service.parseCompressionStats(raw)
  ↓
DetailsPanel.updateCompressionStats(stats)
  ↓
WebView displays cards + tables
```

### Interaction Flow
```
User clicks Compression icon in status bar
  ↓
Command: elysiaUsage.showCompressionDetails
  ↓
DetailsPanel.show(config, extensionUri, service, 'compression')
  ↓
WebView receives message: { type: 'init', initialTab: 'compression' }
  ↓
JavaScript: switchTab('compression') automatically
  ↓
User sees Compression tab active immediately
```

### Verification
🔄 Pending — needs compilation test + manual UI verification

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
