# Elysia Companion — Development Log

> Chronological change history following OKF convention  
> Format: ## YYYY-MM-DD — Description

---

## 2026-11-23 — Rich model selector (v0.3.2)

### Summary
The Usage tab's model dropdown listed bare IDs. Each row now shows two lines —
model name plus `262K ctx · $0.95 in / $4.00 out` — with an `ⓘ` button opening a
detail tooltip (description, exact context, auto-compact, full pricing). Selecting a
model still goes through the existing confirmation dialog.

### Changed
- `src/modelCatalog.ts` (new) — typed catalog of 13 models: label, "best for",
  context, auto-compact and pricing, plus `formatContext` / `formatInlinePrice` /
  `buildCatalogView`; verification date recorded in the header
- `src/detailsPanel.ts` — two-line rows, `ⓘ` tooltip (`position: fixed` on `<body>` so
  the dropdown's `overflow-y: auto` cannot clip it; flips above when short of room),
  dropdown `max-height: 300px → min(60vh, 520px)`, provenance footer
- `architecture/design.md` — ADR-009; `architecture/spec.md` — catalog contract
- `architecture/plans/model_selector_metadata_plan.md` (new) — BLAST plan

### Rationale
`elysia-code --models` returns names only — context and pricing live in
`MODEL_CONTEXT_LIMITS` / `MODEL_COSTS` but are printed only for the active model, and
the "Best for" text is not in the CLI at all. Metadata is therefore curated in the
extension while the list stays live from the CLI; a model missing from the catalog
renders name-only rather than breaking. See ADR-009.

### Notes
- Verified by executing the emitted webview JS against a simulated DOM with
  configurable geometry (37/37 checks): rendering, tooltip open/close/flip across six
  viewport sizes and four anchor positions, unknown-model fallback, hostile model IDs,
  and the model-change flow. Plus 14 static checks on the emitted HTML.
- Fixed during implementation: `getElementById('modelTooltip')` ran before the element
  existed in the document; `formatContext` rounded `196608` up to `197K` instead of
  flooring to `196K`.
- Fixed packaging: `.vscodeignore` does not read `.gitignore`, so scratch files
  (`.tmp/`, `mockups/`, `.git`) were being bundled into the VSIX — 37 files/120KB.
  Added explicit exclusions.
- Packaged as `releases/elysia-companion-0.3.2.vsix`. The first build was made before
  the version bump and collided with the published `0.3.1` filename; it was discarded.

### Regression found in testing (clicking a model did nothing)
Reported by the user after installing the build: hovering a row showed the tooltip
correctly, but clicking a model did nothing — no confirmation dialog, so no model
change was possible.

**Cause:** the fix for handler injection replaced `selectModel('<id>')` with
`selectModel(availableModels[<n>])`. Inline attribute handlers are compiled in
**global** scope, and `availableModels` is declared with `let` inside the webview
IIFE — invisible to them. Every click threw `ReferenceError: availableModels is not
defined` and died silently. Hover kept working because `showModelTip(this, <n>)` only
passes literals; `availableModels` was read inside the function body, which does close
over the IIFE scope.

**Fix:** the handler now calls `selectModelByIndex(<n>)`, a `window`-level function
that closes over `availableModels` and resolves the ID. The attribute still carries
only a bare integer, so the injection fix is preserved.

**Why the test suite missed it:** the harness called `window.selectModel()` directly,
bypassing the inline attribute the browser actually evaluates. Checks were added that
extract the rendered `onclick` text and evaluate it in global scope, the way a browser
does. Mutation-tested: reintroducing the bug produces 12 failures naming
`availableModels is not defined`.

A static check for this was also attempted and then removed — the emitted HTML embeds
the row template as client-side JS source, so a regex over it cannot see the handler
expression. Only the behavioural check catches this; a static test there would have
passed for the wrong reason.

### Post-review fixes
A fresh-context review raised findings that were then verified and fixed:
- **Own-property lookup.** `MODEL_CATALOG[model]` reached `Object.prototype`, so a
  gateway model named `toString`/`constructor`/`__proto__` rendered a literal
  `"undefined"` second line and threw in the tooltip instead of degrading to
  name-only as documented. Now guarded by `hasOwnProperty`.
- **Handler injection.** Model IDs were interpolated into inline handler string
  literals; HTML entities are decoded before the attribute compiles as JS, so an id
  containing `'` could break out and execute. Handlers now receive the numeric row
  index and resolve the id from `availableModels` at call time. (The pattern was
  pre-existing, but it was the last unescaped sink in the row.)
- **Tooltip geometry.** The left clamp used `Math.min` over `innerWidth - tipWidth - 8`,
  which goes negative in a panel narrower than the tooltip (~300px VS Code sidebar),
  pushing it off-screen. Now clamped low-to-high, with `max-width: min(320px, 100vw - 16px)`
  in CSS. The "covers its own anchor" flicker case is bounded by clamping `top` first.
- **Provenance footer** was below the fold in a scrollable list, defeating its purpose;
  now `position: sticky`, and it no longer cites a source when the list failed to load.
- **Data-fidelity wording.** `modelCatalog.ts` claimed verbatim transcription of the
  site's descriptions, but the prose had been condensed. The header now states that
  the numeric fields are exact and the prose is adapted. (The numbers were verified
  13/13 against the site.)
- **Duplicated helper.** `formatTokenCount` was byte-identical to `formatContext`;
  it now delegates.
- **Test-quality gap.** The first harness used a fixed 1200x800 viewport, which could
  not fail on the narrow-panel or short-viewport bugs. Rewritten with parameterised
  geometry, and the stub now models the CSS `max-width` rule. Mutation-tested: reverting
  the own-property guard produces 6 failures, so the suite is not vacuous.

---

## 2026-11-23 — Documentation and packaging audit (v0.3.2)

### Summary
Full sweep of the repo's description surface — README, CHANGELOG, RELEASE_NOTES,
SETUP_GUIDE, CLAUDE.md, architecture index — plus a fresh VSIX, to confirm they
describe what the extension actually does.

### Documentation gaps closed
- **README** — version/links were pinned to `0.3.1` (badge, install commands, tree,
  footer); dashboard described as "Two tabs" when there are three; the Plugins tab,
  the Model Information card, and the `elysiaUsage.managePlugins` command were all
  undocumented; the Model Management section advertised models that do not exist on
  the gateway ("GPT-4, GPT-4o, llama, mistral"); the CLI table lacked
  `--compression-restart`; Troubleshooting still cited `--compression-disable`.
- **RELEASE_NOTES** — still the v0.3.1 Plugins-tab notes. Rewritten for v0.3.2.
- **SETUP_GUIDE** — version and download links at `0.3.1`, install examples at
  `0.2.0`; version-history table stopped at 0.2.0, omitting 0.2.1/0.3.1/0.3.2.
- **CHANGELOG** — the 0.3.2 entry omitted the click regression, the prototype-key
  fix, the tooltip-clamp fix, and the packaging cleanup; added a Security section
  for the handler-injection fix and a verification note.
- **CLAUDE.md** — added §2.7 (catalog schema + the four invariants), ADR-009 summary,
  `modelCatalog.ts` in the file tree, Model Metadata feature row, package version.
- **architecture/index.md** — version 0.3.1 → 0.3.2, ADR count 8 → 9, added the
  v0.3.2 plan.

### Packaging gaps closed
`.vscodeignore` was letting three classes of file into the VSIX:
- `*.sh` — `build-release.sh` was shipping (the `*.ps1`/`*.cmd` rules had no `.sh` peer)
- `out/**/*.map` — five source maps (~25 KB) leaked because the `!out/**` negation
  runs *after* `**/*.map` and re-included them
- `mockup-*.html` — five legacy root-level mockups (~76 KB) predating the `mockups/`
  exclusion, which did not cover the root files

Package goes from 26 files / 348 KB to 16 files / 223 KB. `extension/` now contains
only `out/*.js`, `package.json`, `README.md`, `CHANGELOG.md`, `RELEASE_NOTES.md`,
`SETUP_GUIDE.md`, `tools/build_vscode_extension.py`, and `build-release.sh` is gone.

### Verified
`unzip -l` on the rebuilt VSIX confirms every exclusion; `selectModelByIndex` present
in the packaged `out/detailsPanel.js`; 44/44 behavioural + 14/14 static checks pass
against the emitted HTML.

---

## 2026-11-23 — Plugin Manager tab (v0.3.1)

### Summary
New **Plugins** tab in the dashboard to toggle Caveman/Ponytail (mode + level)
without hand-editing `~/.claude/settings.json`. Tracing and Shunt shown as
read-only "Managed" badges.

### Changed
- `src/settingsService.ts` (new) — atomic read/write of `settings.json` env block;
  only `CAVEMAN_DEFAULT_MODE`/`PONYTAIL_DEFAULT_MODE` written; other keys preserved
- `src/detailsPanel.ts` — Plugins tab (toggle + level select + restart banner)
- `src/elysiaService.ts` — `restartCompression()` now uses `--compression-restart`
  (single atomic command) with fallback to `--compression-enable`; legacy
  `--compression-disable` sequence removed
- `src/extension.ts` + `package.json` — `elysiaUsage.managePlugins` command (ADR-007)
- `architecture/design.md` — ADR-008 (plugin state in settings.json, edited directly)

### Rationale
Restarting the Elysia/Claude Code session is done via the compression proxy
restart; `--compression-restart` is the current atomic command (the legacy
`--compression-disable` flag is being removed).

### Verified
`tsc -p ./` clean; round-trip keeps 30 env keys byte-identical; corrupt/missing
settings.json never overwritten; `--compression-restart` validated live (proxy
back on port 8787); UI smoke-tested by user.

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
