# Elysia Companion — Project Map

> **Project Type:** VS Code Extension  
> **Status:** ✅ Production Ready (v0.3.2)  
> **Last Updated:** 2026-11-23  
> **BLAST Phase:** 5 (Trigger - Deployed)  
> **Repository:** https://github.com/Viottofc-Informa/Elysia-Companion

---

## 1. North Star

### 1.1 Outcome
Enable Elysia users to monitor usage, manage models, control services, and analyze compression savings directly from VS Code without leaving their editor.

### 1.2 Integrations
- **Elysia CLI**: `elysia-code` command-line tool
- **VS Code API**: Status bar, Webview panels, Commands
- **Local System**: Windows/macOS/Linux process execution

### 1.3 Source of Truth
- **Primary**: `elysia-code --config` (live data)
- **Models**: `elysia-code --models` (available models)
- **Compression**: `elysia-code --compression-stats --json` (detailed metrics)
- **Settings**: VS Code `settings.json`

### 1.4 Delivery
- **Package**: `.vsix` file — versioned in `releases/` and downloadable from GitHub
- **Marketplace**: VS Code Extension Marketplace (future)
- **Dashboard**: Webview panel embedded in VS Code (3 tabs)

### 1.5 Behavioral Rules
- Never block the editor (async operations)
- Graceful degradation (show error states, not crashes)
- Respect user settings (configurable paths)
- Auto-recovery (try default paths if configured fails)

---

## 2. Data Schema

### 2.1 Extension Configuration (Input)

```json
{
  "elysiaUsage": {
    "enableTracking": true,
    "refreshInterval": 300000,
    "warningThreshold": 45,
    "criticalThreshold": 85,
    "showDollarAmount": true,
    "showPercentage": true,
    "elysiaCodePath": "elysia-code"
  }
}
```

### 2.2 Elysia Config (Output)

```typescript
interface ElysiaConfig {
  version: string;           // "0.3.10"
  model: string;             // "kimi-k3"
  isPrivate: boolean;        // false
  workspace: string;         // "ws-inform-1a0500"
  configId: string;          // "pc-defaul-0c6289"
  langSmithEnabled: boolean; // true
  status: string;            // "Active"
  usedAmount: number;        // 64.1131
  totalAmount: number;         // 200.00
  percentage: number;          // 32.1
  isResetState: boolean;       // false
  // v0.3.10+ fields
  context?: string;          // "1048576 tokens"
  autoCompact?: string;      // "900000 tokens"
  inputPrice?: string;       // "$3.30 USD"
  outputPrice?: string;      // "$16.50 USD"
  resets?: string;           // "Monthly"
  expires?: string;          // "2026-12-31"
  compressionLog?: string;   // "C:\Users\...\compression.log"
}
```

### 2.3 Models Response

```typescript
interface ModelsResponse {
  models: string[];       // ["zai.glm-5", "kimi-k2.5", "claude-sonnet-5", ...]
  activeModel: string;    // "kimi-k2.5"
}
```

### 2.4 Compression Stats (Output) — v0.2.0

Source: `elysia-code --compression-stats --json`

```typescript
interface CompressionStats {
  enabled: boolean;                          // true
  port: number;                              // 8787
  mode: string;                              // "cache"
  session: CompressionSession;               // current session metrics
  lifetime: CompressionLifetime;             // all-time metrics
  projects: Record<string, ProjectStats>;    // per-project breakdown
  byModel: Record<string, ModelStats>;       // per-model breakdown
  recentRequests: RecentRequest[];           // last 5 requests
}

interface CompressionSession {
  requests: number;              // 15
  tokensSaved: number;           // 12194
  compressionSavingsUsd: number; // 0.0366
  cacheSavingsUsd: number;       // 0
  totalInputTokens: number;      // 588015
  totalInputCostUsd: number;     // 1.7638
  savingsPercent: number;        // 2.03
  startedAt: string;             // ISO 8601
  lastActivityAt: string;        // ISO 8601
}

interface CompressionLifetime {
  requests: number;              // 10912
  tokensSaved: number;           // 32186314
  compressionSavingsUsd: number; // 37.4466
  cacheSavingsUsd: number;       // 0.0064
  totalInputTokens: number;      // 772528980
  totalInputCostUsd: number;     // 1629.6187
}

interface ProjectStats {
  requests: number;              // 10394
  tokensSaved: number;           // 30992088
  compressionSavingsUsd: number; // 37.4466
  totalInputTokens: number;      // 760044643
  totalInputCostUsd: number;     // 1618.9861
  lastActivityAt: string;
  savingsPercent: number;        // 3.92
}

interface ModelStats {
  requests: number;
  tokensSaved: number;
  compressionSavingsUsd: number;
  totalInputTokens: number;
  totalInputCostUsd: number;
  savingsPercent: number;
}

interface RecentRequest {
  requestId: string;              // "hr_1791556159_000015"
  timestamp: string;              // ISO 8601
  model: string;                  // "kimi-k2.5"
  inputTokensOriginal: number;    // 66396
  inputTokensOptimized: number;   // 65594
  outputTokens: number;           // 906
  tokensSaved: number;            // 802
  savingsPercent: number;         // 1.208
  transformsApplied: string[];    // ["anthropic:tool_schema_compaction"]
}
```

**Parsing notes:**
- Source JSON is deeply nested (`stats.display_session`, `stats.persistent_savings.lifetime`, etc.)
- `parseCompressionStats()` flattens it into the typed structure above
- Raw JSON contains ~40 additional keys (telemetry, otel, rollout, throughput) that are **intentionally discarded** — not relevant to end users
- `recentRequests` is sliced to the first 5 entries

### 2.5 Registered Commands (v0.2.0)

All commands must be declared in `package.json` under `contributes.commands` **and** registered in `extension.ts`. Missing the manifest entry means the command does not appear in the Command Palette (see ADR-003).

```typescript
interface Commands {
  'elysiaUsage.refresh': () => Promise<void>;
  'elysiaUsage.showDetails': () => Promise<void>;                // opens Usage tab
  'elysiaUsage.showCompressionDetails': () => Promise<void>;     // opens Compression tab
  'elysiaUsage.openSettings': () => void;
  'elysiaUsage.restartCompression': () => Promise<void>;
  'elysiaUsage.togglePrivateMode': () => Promise<void>;
  'elysiaUsage.getModels': () => Promise<ModelsResponse>;
  'elysiaUsage.changeModel': (modelName: string) => Promise<void>;
  'elysiaUsage.managePlugins': () => Promise<void>;                 // opens Plugins tab
}
```

### 2.6 Status Bar Items

| Item | Priority | Command on click |
|------|----------|------------------|
| `🟢 $X.XX / XX.X%` | 100 | `elysiaUsage.showDetails` |
| `🟢 Compression` | 99 | `elysiaUsage.showCompressionDetails` |
| `🔓 Standard` / `🔒 Private` | 98 | `elysiaUsage.togglePrivateMode` |

### 2.7 Model Metadata Catalog (v0.3.2)

Source: curated in `src/modelCatalog.ts` — **not** read from the CLI (see ADR-009).

```typescript
interface PriceTier {
  short: number;      // USD per 1M tokens, prompt at or below `threshold`
  long: number;       // USD per 1M tokens, prompt above `threshold`
  threshold: number;  // prompt-token boundary
}

interface ModelMeta {
  label: string;         // "Kimi K3"
  bestFor: string;       // "General-purpose coding & long-form tasks"
  context: number;       // 1048576 (tokens)
  autoCompact: number;   // 900000 (tokens)
  input: PriceTier;
  output: PriceTier;
}

// MODEL_CATALOG: Record<string, ModelMeta> — 13 entries, keyed by CLI model id
```

**Invariants:**
- **Own-property lookup only.** Always resolve via `hasOwnProperty` (wrapped as
  `lookupMeta()`). A bare `MODEL_CATALOG[id]` reaches `Object.prototype`, so a model
  named `toString`/`constructor`/`__proto__` renders a literal `"undefined"` line
  and throws in the tooltip.
- **Missing entries degrade, never fabricate.** A model absent from the catalog
  renders name-only: no metadata line, no `ⓘ`, still selectable.
- **Inline handler scope.** Webview inline attributes (`onclick`, `onmouseenter`)
  are compiled by the browser with the **global object** as scope chain. Anything
  declared with `let`/`const` inside the webview IIFE is invisible to them. Handlers
  therefore carry only **numeric literals** and call `window`-level functions
  (`selectModelByIndex(n)`, `showModelTip(this, n)`) that close over IIFE state.
  Interpolating a model id into a handler is both an injection risk and a scoping bug.
- **Formatting lives in TypeScript.** The catalog is pre-rendered to a serialisable
  view via `buildCatalogView()`; the webview never re-implements formatting.

---

## 3. File Structure

```
elysia-companion/
├── .vscode/
│   └── launch.json              # Debug configuration
├── out/
│   ├── extension.js             # Compiled entry point
│   ├── elysiaService.js         # Core service
│   ├── statusBarManager.js      # UI: Status bar
│   ├── detailsPanel.js          # UI: Webview
│   └── settingsService.js       # Plugin state I/O
├── src/
│   ├── extension.ts             # Entry point, command registration
│   ├── elysiaService.ts         # CLI communication, parsing ★
│   ├── statusBarManager.ts      # Status bar lifecycle
│   ├── detailsPanel.ts          # Webview HTML/JS/CSS with 3 tabs
│   ├── modelCatalog.ts          # Curated model metadata (v0.3.2) ★
│   └── settingsService.ts       # Plugin state: ~/.claude/settings.json (v0.3.1)
├── tests/                       # Webview test harnesses (run: npm test)
│   ├── run_all.js               # Runner — both harnesses, fails on FAIL
│   ├── emit_html.js             # Static checks on the real emitted HTML
│   ├── dom_sim.js               # Behavioural checks against a DOM stub
│   └── make_preview.js          # Builds mockups/model_selector_preview.html
├── architecture/
│   ├── index.md                 # Progressive-disclosure nav
│   ├── design.md                # ADR history (9 records)
│   ├── spec.md                  # Data contracts
│   └── plans/                   # BLAST plans per feature
├── handoffs/
│   ├── handoff_change_model_test.md      # Model change debugging
│   └── handoff_change_model_test_v2.md   # Results & fixes
├── releases/
│   └── elysia-companion-0.3.2.vsix       # Packaged extension
├── tools/
│   └── build_vscode_extension.py         # Build + package (Python)
├── build-release.ps1            # Build + package (PowerShell)
├── build-release.sh             # Build + package (Bash)
├── build-and-package.ps1        # Build + package + install
├── build-and-package.cmd        # Build + package + install
├── .vscodeignore                # Package exclusions
├── CHANGELOG.md                 # Version history
├── CLAUDE.md                    # ← This file
├── LICENSE                      # MIT
├── package.json                 # Extension manifest
├── README.md                    # User documentation
├── RELEASE_NOTES.md             # Latest release notes
├── SETUP_GUIDE.md               # Installation guide
├── log.md                       # Development log
└── tsconfig.json                # TypeScript config
```

---

## 4. Key Conventions

### 4.1 CLI Communication Pattern

**Problem**: `cp.spawn()` breaks argument parsing with spaces in Windows paths.

**Solution**: Use `execAsync` for commands with user-provided arguments:

```typescript
// ❌ BAD: spawn with manual split
const args = command.split(' ').slice(1); // Breaks "zai.glm-5"

// ✅ GOOD: exec with shell handling
const { stdout } = await execAsync(`"${path}" --model "${model}"`);
```

### 4.2 Output Normalization Pattern

Handle encoding issues (two spaces, Unicode arrows):

```typescript
const normalized = output
  .toLowerCase()
  .replace(/\s+/g, ' ');    // Collapse multiple spaces

const hasOk = normalized.includes('ok');
const hasUpdated = normalized.includes('model updated');
```

### 4.3 WebView Communication

Post messages from Webview → Extension:

```typescript
// Webview (JS)
vscode.postMessage({ command: 'changeModel', model: 'zai.glm-5' });

// Extension (TS)
webview.onDidReceiveMessage(async (msg) => {
  if (msg.command === 'changeModel') {
    await elysiaService.changeModel(msg.model);
  }
});
```

---

## 5. Status

### 5.1 Completed Features ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Usage Tracking | ✅ | Status bar with lighthouse indicators |
| Dashboard | ✅ | Webview with 3 tabs: **Usage**, **Compression**, **Plugins** |
| Restart Service | ✅ | Fixed compression restart with execAsync |
| Change Model | ✅ | Working after fixing exec pattern |
| Model Selector | ✅ | Dropdown with active badge in **Usage tab** |
| Model Metadata | ✅ | v0.3.2 — Context + pricing per row, `ⓘ` detail tooltip, provenance footer |
| Private Mode Toggle | ✅ | Status bar icon + dashboard button |
| Compression Stats | ✅ | v0.2.0 — Detailed metrics from `--compression-stats --json` |
| Session/Lifetime Savings | ✅ | v0.2.0 — Tokens and USD saved display |
| Top Projects/Models | ✅ | v0.2.0 — Collapsible tables with top 5 each |
| Recent Requests | ✅ | v0.2.0 — Last 5 requests with detailed metrics |
| Compression Icon → Compression Tab | ✅ | v0.2.0 — Click opens dashboard directly on Compression tab |
| Plugin Manager | ✅ | v0.3.1 — Plugins tab: toggle Caveman/Ponytail (mode+level); Tracing/Shunt read-only |
| Settings | ✅ | Configurable thresholds |
| Auto-refresh | ✅ | Every 5 minutes |
| Build/Package Scripts | ✅ | v0.2.0 — PS1, CMD, and Bash variants |

### 5.2 Known Limitations

| Issue | Workaround | Priority |
|-------|------------|----------|
| Requires reload after model change | ✓ Auto-suggest "Reload Window" | Low |
| Does not detect model changes from CLI | ✓ Manual refresh | Low |
| Compression restart disconnects briefly | ✓ Expected behavior | Info |
| Compression stats loaded on tab switch, not auto-refreshed | ✓ Click "Refresh Stats" | Low |

---

## 6. Development Guide

### 6.1 Quick Start

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in Extension Development Host
code . &
# Then press F5
```

### 6.2 Debug Output Channel

View detailed logs:
1. `View → Output` (or `Ctrl+Shift+U`)
2. Select "Elysia Companion" from dropdown
3. Logs format: `[ElysiaService] Message`

### 6.3 Tests

```bash
npm test          # 58 checks — 14 static + 44 behavioural
```

No Extension Host required. The harnesses work by extracting the **real** webview
HTML from the compiled extension (`out/detailsPanel.js`) with a stubbed `vscode`
module, then asserting on it two ways:

| Harness | What it proves |
|---------|----------------|
| `tests/emit_html.js` | The emitted markup is correct — catalog injected, tooltip on `<body>`, footer text, CSS rules, and that the row template builds handlers from the row index rather than interpolating a model ID |
| `tests/dom_sim.js` | The emitted **script** behaves correctly against a DOM stub with parameterised geometry — rendering, tooltip open/close/flip, unknown-model fallback, hostile IDs, and the model-change flow |

**The critical detail:** `dom_sim.js` extracts the rendered `onclick` attribute text
and evaluates it in **global scope**, the way a browser does. Calling
`window.selectModel()` directly bypasses that and will not catch IIFE-scope reference
bugs — which is exactly how the "clicking a model does nothing" regression shipped.
Do not replace those checks with direct function calls.

Both harnesses are mutation-tested: reintroducing the click bug produces 12 failures
and `npm test` exits non-zero.

`make_preview.js` builds `mockups/model_selector_preview.html`, a browser-openable
preview generated from the same emitted HTML, so it cannot drift from what ships.

### 6.4 Test Commands

Test CLI manually before implementing:
```powershell
# Get config
elysia-code --config

# Get models
elysia-code --models

# Change model
elysia-code --model "zai.glm-5"

# Disable compression
elysia-code --compression-disable

# Enable compression
elysia-code --compression-enable
```

---

## 7. Architecture Decisions

### ADR-001: Why execAsync instead of spawn?

**Context**: Commands like `--model "zai.glm-5"` require proper quoting.

**Decision**: Use `execAsync` for commands with user-provided arguments.

**Consequences**:
- ✅ Shell handles quoting automatically
- ✅ Simpler code (no manual argument parsing)
- ⚠️ Shell injection possible if model name not validated (mitigated: model from trusted list)

### ADR-002: Lighthouse Thresholds

**Context**: Original thresholds were 75% (yellow) and 90% (red).

**Decision**: Changed to 45% and 85% based on actual Informa usage patterns.

**Consequences**:
- Users see warning earlier (at 45% vs 75%)
- More time to react before hitting 85% critical

### ADR-007: Commands must be declared in package.json

**Context**: A new command `elysiaUsage.showCompressionDetails` was registered in `extension.ts` and assigned to the Compression status bar item via `.command`, but the status bar item did not become clickable.

**Root Cause**: The command was registered at runtime (`vscode.commands.registerCommand`) but **not declared** in `package.json` under `contributes.commands`. VS Code validates status bar item commands against the manifest; an undeclared command leaves the item non-interactive (no hover highlight, no click handler). The same defect affected `elysiaUsage.togglePrivateMode`.

**Decision**: Every command must appear in **both** places:
1. `package.json` → `contributes.commands` (declaration — makes it resolvable and palette-visible)
2. `extension.ts` → `vscode.commands.registerCommand` (implementation)

**Consequences**:
- ✅ Status bar items become properly clickable and show hover feedback
- ✅ Commands appear in the Command Palette with their icon and category
- ⚠️ Two places to keep in sync — a checklist item for every new command
- 📌 Also applies to `keybindings`, `menus`, and any UI that references a command ID

### ADR-009: Model metadata is a curated catalog, not read from the CLI

**Context**: The model selector needed context window and pricing per model. `elysia-code --models` returns **names only**; context and pricing exist in the CLI's `MODEL_CONTEXT_LIMITS` / `MODEL_COSTS` maps but are printed for the **active model only**, and the "Best for" prose does not exist in the CLI at all.

**Decision**: Curate the metadata in `src/modelCatalog.ts`, keyed by CLI model id, while the **list** stays live from `--models`.

**Consequences**:
- ✅ Selector is consistent with `pilots.ai.informa.com/elysia-code/` and independent of CLI output format changes
- ✅ The five `--config` price/context fields still drive the Model Information card; the catalog only enriches the *selector*
- ⚠️ Catalog drifts as the gateway adds/removes models — a model absent from it degrades to name-only rather than breaking
- 📌 Numeric fields are verified against the site (13/13); prose is adapted, not verbatim — recorded in the file header

See `architecture/design.md` for full ADR history.

---

## 8. References

### Internal
- [README.md](README.md) — User documentation
- [SETUP_GUIDE.md](SETUP_GUIDE.md) — Installation instructions
- [CHANGELOG.md](CHANGELOG.md) — Version history
- [architecture/design.md](architecture/design.md) — Architecture decisions
- [architecture/spec.md](architecture/spec.md) — Data contracts

### External
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Elysia Platform](https://elysia.informa.com/)
- [OKF Spec](https://github.com/GoogleCloudPlatform/knowledge-catalog)

---

## 9. Next Actions (Backlog)

- [ ] Submit to VS Code Marketplace
- [ ] Restore `npm run lint` — no ESLint config file exists, so `eslint src --ext ts` errors out
      ("couldn't find a configuration file"). All three devDependencies are already
      installed (`eslint ^8.56.0`, `@typescript-eslint/eslint-plugin` and `.../parser`
      `^6.15.0`) — only `.eslintrc.json` is missing. Removed from `pretest` in v0.3.2 so it
      does not block `npm test`; add the config, then re-add `&& npm run lint` to `pretest`.
- [ ] Extend the test harnesses to `elysiaService.ts` parsing (currently webview-only)
- [ ] Implement diagnostic health check
- [ ] Add usage history chart (trend over time)
- [ ] Add compression savings trend chart (`savings_history` from JSON is currently unused)
- [ ] Support multiple Elysia workspaces
- [ ] Export compression stats to CSV
- [ ] Auto-refresh compression stats alongside usage refresh

---

## 10. Release Process

```bash
# 1. Bump version in package.json
# 2. Compile and package
npm run compile
npx vsce package --no-dependencies

# 3. Move artifact to releases/
mv elysia-companion-<version>.vsix releases/

# 4. Commit, tag, push
git add -A
git commit -m "Release v<version>: <summary>"
git tag v<version>
git push origin main --tags
```

**Note:** `gh` CLI is not available on the workstation — GitHub Releases must be created via the web UI at
`https://github.com/Viottofc-Informa/Elysia-Companion/releases/new?tag=v<version>`.

**Note:** The VSIX is versioned inside the repo (`releases/`), which keeps it directly downloadable via the raw URL.
Each build adds ~63 KB to git history — if this becomes a concern, migrate to GitHub Releases attachments only.

---

**Maintained by:** Informa AI Team  
**Publisher:** fernando.viotto@informa.com  
**License:** MIT
