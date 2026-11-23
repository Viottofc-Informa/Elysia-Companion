---
type: Specification
title: Elysia Companion - Data Contracts
description: JSON schemas, API contracts, and type definitions
tags:
  - specification
  - schema
  - types
  - contract
generated: { by: "human:viottof", at: '2026-11-23T00:00:00Z' }
status: stable
---

# Elysia Companion — Data Contracts

## Configuration Schema

```typescript
// Extension settings (src/extension.ts)
interface ExtensionConfig {
  elysiaUsage: {
    enableTracking: boolean;      // Default: true
    refreshInterval: number;        // Default: 300000 (ms)
    warningThreshold: number;       // Default: 45 (%)
    criticalThreshold: number;      // Default: 85 (%)
    showDollarAmount: boolean;      // Default: true
    showPercentage: boolean;        // Default: true
    elysiaCodePath: string;         // Default: "elysia-code"
  }
}
```

## CLI Output Schemas

### Config Output (v0.3.10+)

Example:
```
Elysia Config
--------------
Version      : 0.3.10
Model        : kimi-k3
Context      : 1048576 tokens
Auto compact : 900000 tokens
Input / 1M   : $3.30 USD
Output / 1M  : $16.50 USD
Pricing      : supplied table, added 19 Oct 2026; rates may change
Private      : false
Workspace    : ws-inform-1a0500
Config ID    : pc-defaul-0c6289
LangSmith    : enabled

Usage
--------------
Status     : Active
Used       : $64.1131 / $200.00
            [██████░░░░░░░░░░░░░░] 32.1%
Resets     : Monthly
Expires    : 2026-12-31

Compression
--------------
Status  : enabled
Log     : C:\Users\...\.elysia\compression.log
```

Parsed to:
```typescript
interface ElysiaConfig {
  // Core fields
  version: string;           // "0.3.10"
  model: string;             // "kimi-k3"
  isPrivate: boolean;        // false
  workspace: string;           // "ws-inform-1a0500"
  configId: string;          // "pc-defaul-0c6289"
  langSmithEnabled: boolean; // true
  status: string;            // "Active"
  usedAmount: number;        // 64.1131
  totalAmount: number;       // 200.00
  percentage: number;          // 32.1
  isResetState: boolean;       // false
  // v0.3.10+ fields (optional, backwards compatible)
  context?: string;          // "1048576 tokens"
  autoCompact?: string;      // "900000 tokens"
  inputPrice?: string;       // "$3.30 USD"
  outputPrice?: string;      // "$16.50 USD"
  resets?: string;           // "Monthly"
  expires?: string;          // "2026-12-31"
  compressionLog?: string;   // "C:\Users\...\.elysia\compression.log"
}
```

Parsing rules:
- **Version**: Line starts with "Version", extract after ":"
- **Model**: Line starts with "Model", extract after ":"
- **Context** (v0.3.10+): Line starts with "Context", extract after ":"
- **Auto compact** (v0.3.10+): Line starts with "Auto compact", extract after ":"
- **Input / 1M** (v0.3.10+): Line starts with "Input / 1M", extract after ":"
- **Output / 1M** (v0.3.10+): Line starts with "Output / 1M", extract after ":"
- **Private**: Line starts with "Private", compare to "true"
- **Workspace**: Line starts with "Workspace", extract after ":"
- **Config ID**: Line starts with "Config ID", extract after ":"
- **LangSmith**: Line starts with "LangSmith", check for "enabled"
- **Status**: Line starts with "Status", extract after ":"
- **Resets** (v0.3.10+): Line starts with "Resets", extract after ":"
- **Expires** (v0.3.10+): Line starts with "Expires", extract after ":"
- **Usage**: Line starts with "Used", regex `\$([\d.]+)\s*/\s*\$([\d.]+)`, or "-" for reset state
- **Log** (v0.3.10+): Line starts with "Log", extract after ":", must contain ".log"
- **Percentage**: Calculated: `(usedAmount / totalAmount) * 100`, or 0 if reset state

---

### Models Output

Example:
```
Available models
-----------------
  zai.glm-5
  kimi-k2.5  ← active
  claude-sonnet-5
  claude-sonnet-4-6
  claude-haiku-4-5
  gpt-5-4
  gpt-5-4-nano
  gpt-5-4-mini
  deepseek-v3
  mistral-large-3
  llama-4-maverick-17b-instruct
  llama-4-scout-17b-instruct
  minimax-m2.5
```

Parsed to:
```typescript
interface ModelsResponse {
  models: string[];       // All model names
  activeModel: string;    // The one marked with "← active"
}
```

Parsing rules:
1. Skip header lines: "Available models", lines starting with "---"
2. Skip empty lines
3. For each line:
   - If contains "← active":
     - Remove "← active" to get model name
     - Mark as activeModel
   - Else if not "OK":
     - First word before whitespace is model name

**Important:** `--models` returns **names only**. It carries no context window,
pricing, or description — measured against CLI 0.3.12, where the metadata lives in
`MODEL_CONTEXT_LIMITS` / `MODEL_COSTS` but is printed only for the active model via
`--config`. Per-model metadata therefore comes from the catalog below.

---

### Model Metadata Catalog (v0.3.2, `src/modelCatalog.ts`)

Source: curated from https://pilots.ai.informa.com/elysia-code/ (pricing table dated
19 Oct 2026), verified 2026-11-23. Not live gateway output — the dropdown footer
states the source and verification date for exactly this reason.

```typescript
interface PriceTier {
  short: number;       // USD per 1M tokens, prompt <= threshold
  long: number;        // USD per 1M tokens, prompt > threshold
  threshold: number;   // token count where `long` applies; 0 = no tiering
}

interface ModelMeta {
  label: string;        // "Kimi K3"
  bestFor: string;      // site "Best for" text; rendered in the tooltip only
  context: number;      // tokens
  autoCompact: number;  // tokens
  input: PriceTier;
  output: PriceTier;
}
```

Catalog values (13 models, CLI 0.3.12):

| ID | Context | Auto-compact | Input | Output |
|----|---------|--------------|-------|--------|
| `kimi-k2.7-code` | 262,144 | 220,000 | $0.95 | $4.00 |
| `kimi-k3` | 1,048,576 | 900,000 | $3.30 | $16.50 |
| `zai.glm-5.3` | 1,048,576 | 900,000 | $1.40 | $4.40 |
| `gpt-5.6-luna` | 1,050,000 | 900,000 | $0.40 | $1.80 |
| `gpt-5.3-codex` | 400,000 | 340,000 | $1.75 | $14.00 |
| `gpt-5-4` | 1,050,000 | 900,000 | $2.50 | $15.00 |
| `gpt-5-4-mini` | 400,000 | 340,000 | $0.75 | $4.50 |
| `claude-sonnet-5-5` | 1,000,000 | 850,000 | $2.20 | $11.00 |
| `claude-haiku-5-5` | 1,000,000 | 850,000 | $0.11 / $0.55 | $0.55 / $2.75 |
| `deepseek-v4` | 1,048,576 | 900,000 | $1.74 | $3.48 |
| `deepseek-v4.1-flash` | 1,048,576 | 900,000 | $0.37 | $1.50 |
| `minimax-m2.5` | 196,608 | 170,000 | $0.30 | $1.20 |
| `gpt-6.1-sol` | 272,000 | 230,000 | $2.00 | $10.00 |

`claude-haiku-5-5` is the only tiered entry (`threshold: 100000`): its rate depends
on prompt length. The list shows the short-prompt rate with an `up to 100K` note; the
tooltip shows both ranges.

**Fallback contract:** a model returned by `--models` but absent from the catalog
**still renders and remains selectable** — it simply has no second line and no `ⓘ`
button. Metadata is never fabricated; absent data renders as absent.

Webview view model (pre-rendered, because model rows are built in browser JS which
cannot call the TypeScript formatters):

```typescript
interface ModelMetaView {
  label: string;
  line2: string;            // "262K ctx · $0.95 in / $4.00 out"
  bestFor: string;
  contextText: string;      // "1,048,576 tokens"
  autoCompactText: string;  // "900,000 tokens"
  inputLines: string[];     // flat: 1 entry; tiered: 2 entries
  outputLines: string[];
}
```

Webview invariants (all three are enforced, not incidental):
- **Catalog lookup must be an own-property check.** Plain bracket access reaches
  `Object.prototype`, so a gateway model named `toString` or `constructor` would look
  like it had metadata and render a literal `"undefined"`. The webview uses
  `Object.prototype.hasOwnProperty.call`, mirroring `getModelMeta`.
- **Inline handlers receive the row index, never the model ID.** HTML character
  references are decoded before an attribute value is compiled as JS, so an ID
  containing `'` would break out of the string literal. Indices are plain digits.
- **Inline handlers must not reference an IIFE-scoped variable.** A browser compiles
  an inline attribute handler with the GLOBAL object as its scope chain, so anything
  declared with `let`/`const` inside the webview IIFE is invisible to it. Referencing
  `availableModels` directly in an `onclick` throws `ReferenceError` and kills the row
  silently — the row looks clickable but does nothing. The handler therefore calls
  `selectModelByIndex(<n>)`, a `window`-level function that closes over
  `availableModels` and resolves the ID internally.

Formatting rules:
- `formatContext` **floors** at 1M and 1K boundaries — context is a capacity, so
  rounding up would overstate it. `196608` → `"196K"`, not `"197K"`. All values at or
  above 1M collapse to `"1M"`, normalising 1,048,576 / 1,050,000 / 1,000,000.
- `formatUsd` always renders two decimals, matching the site's table.
- The view model is serialised JSON into the webview with `</` escaped as `<\/` so it
  cannot terminate the enclosing `<script>` block.

---

### Model Change Output

Success:
```
OK  Model updated to zai.glm-5
Restart Claude Code to apply the change.
```

Parsed:
- Has "OK": true
- Has "Model updated": true
- Has model name: true

Failure (typically no output or error message)

---

## Compression Stats Output (v0.2.0)

### Source

```
elysia-code --compression-stats --json
```

Returns a single JSON object. The extension consumes a **subset** of the ~40 top-level keys.

### Full JSON shape (abridged)

```
{
  "enabled": true,
  "port": 8787,
  "stats": {
    "summary": { "mode": "cache", "api_requests": 15, ... },
    "display_session": { ... },        // → session
    "persistent_savings": {
      "lifetime": { ... },             // → lifetime
      "projects": { ... },             // → projects
      "by_model": { ... }              // → byModel
    },
    "recent_requests": [ ... ],        // → recentRequests (first 5)
    "savings_history": [ ... ],        // NOT consumed
    "pipeline_timing": { ... },        // NOT consumed
    "throughput": { ... },             // NOT consumed
    "telemetry": { ... },              // NOT consumed
    "otel": { ... },                   // NOT consumed
    "rollout": { ... }                 // NOT consumed
  }
}
```

### Consumed fields → typed model

| JSON path | Typed field | Type |
|-----------|-------------|------|
| `enabled` | `enabled` | `boolean` |
| `port` | `port` | `number` |
| `stats.summary.mode` | `mode` | `string` |
| `stats.display_session.*` | `session` | `CompressionSession` |
| `stats.persistent_savings.lifetime.*` | `lifetime` | `CompressionLifetime` |
| `stats.persistent_savings.projects.*` | `projects` | `Record<string, ProjectStats>` |
| `stats.persistent_savings.by_model.*` | `byModel` | `Record<string, ModelStats>` |
| `stats.recent_requests[0..4]` | `recentRequests` | `RecentRequest[]` |

### Parsing rules

1. Parse the entire stdout as JSON — **no line-based parsing** (unlike `--config` and `--models`).
2. Default missing scalars to `0` / `false` / `''` rather than throwing; the CLI omits keys in some states.
3. Slice `recent_requests` to 5 entries for display.
4. Discard all keys not listed in the table above.

### Type definitions

```typescript
interface CompressionStats {
  enabled: boolean;
  port: number;
  mode: string;
  session: CompressionSession;
  lifetime: CompressionLifetime;
  projects: Record<string, ProjectStats>;
  byModel: Record<string, ModelStats>;
  recentRequests: RecentRequest[];
}

interface CompressionSession {
  requests: number;
  tokensSaved: number;
  compressionSavingsUsd: number;
  cacheSavingsUsd: number;
  totalInputTokens: number;
  totalInputCostUsd: number;
  savingsPercent: number;
  startedAt: string;
  lastActivityAt: string;
}

interface CompressionLifetime {
  requests: number;
  tokensSaved: number;
  compressionSavingsUsd: number;
  cacheSavingsUsd: number;
  totalInputTokens: number;
  totalInputCostUsd: number;
}

interface ProjectStats {
  requests: number;
  tokensSaved: number;
  compressionSavingsUsd: number;
  totalInputTokens: number;
  totalInputCostUsd: number;
  lastActivityAt: string;
  savingsPercent: number;
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
  requestId: string;
  timestamp: string;
  model: string;
  inputTokensOriginal: number;
  inputTokensOptimized: number;
  outputTokens: number;
  tokensSaved: number;
  savingsPercent: number;
  transformsApplied: string[];
}
```

### UI presentation

| Section | Component | Collapsible |
|---------|-----------|-------------|
| Status + Mode | Stat cards | No |
| Session Savings | Stat cards (tokens, USD, requests) | No |
| Lifetime Savings | Stat cards (tokens, USD, requests) | No |
| Top Projects | Table (top 5, sorted by tokens saved) | Yes |
| Top Models | Table (top 5, sorted by tokens saved) | Yes |
| Recent Requests | Request cards (last 5) | Yes |

Numbers are abbreviated with `formatNumber()` (`1.2K`, `32.1M`). Timestamps use `formatTime()` (local 2-digit HH:MM:SS).

---

## VS Code Extension API Contracts

### Registered Commands

Every command listed here **must** also be declared in `package.json` under `contributes.commands`.
An undeclared command cannot be assigned to a status bar item — the item stays non-clickable (see ADR-007 in `design.md`).

```typescript
// Commands registered in extension.ts (and declared in package.json)
interface Commands {
  'elysiaUsage.refresh': () => Promise<void>;
  'elysiaUsage.showDetails': () => Promise<void>;                // opens dashboard on Usage tab
  'elysiaUsage.showCompressionDetails': () => Promise<void>;     // opens dashboard on Compression tab
  'elysiaUsage.openSettings': () => void;
  'elysiaUsage.restartCompression': () => Promise<void>;
  'elysiaUsage.togglePrivateMode': () => Promise<void>;
  'elysiaUsage.getModels': () => Promise<ModelsResponse>;
  'elysiaUsage.changeModel': (modelName: string) => Promise<void>;
  'elysiaUsage.managePlugins': () => Promise<void>;                 // opens dashboard on Plugins tab
}
```

> **Consistency check:** the 9 IDs above must match `contributes.commands` in `package.json` exactly.
> Verification: `node -e "require('./package.json').contributes.commands.forEach(c=>console.log(c.command))"` against
> `grep -oE "registerCommand\('[^']+'" src/extension.ts`.
>
> `elysiaUsage.loadCompressionStats` was previously registered as a command but never invoked — compression
> stats are fetched by `DetailsPanel` via the `loadCompressionStats` **WebView message**, not the command bus.
> The dead command and its `CompressionStats` import were removed.

### Status Bar Items

```typescript
interface StatusBarItem {
  text: string;             // "🟢 $XXX.XX / XX.X%"
  tooltip: MarkdownString;  // Hover content
  command: string;          // must be a declared command ID
  backgroundColor?: ThemeColor;
  priority: number;         // alignment order
}
```

| Item | Priority | Text | Command |
|------|----------|------|---------|
| Usage | 100 | `🟢 $X.XX / XX.X%` | `elysiaUsage.showDetails` |
| Compression | 99 | `🟢 Compression` | `elysiaUsage.showCompressionDetails` |
| Private | 98 | `🔓 Standard` / `🔒 Private` | `elysiaUsage.togglePrivateMode` |

### Tab Selection

`DetailsPanel.show()` accepts an optional `initialTab` parameter that is forwarded to the WebView
via the `init` message, so the panel can open directly on either tab.

```typescript
type TabName = 'usage' | 'compression' | 'plugins';

DetailsPanel.show(
  config: ElysiaConfig,
  extensionUri: vscode.Uri,
  elysiaService?: ElysiaService,
  initialTab?: TabName
): void;
```

If the panel is already open, `show()` reveals it and posts a `switchTab` message instead of recreating it.

### WebView Communication

**Extension → WebView:**
```typescript
type WebViewMessage =
  | { type: 'init'; extensionUri: string; initialTab: TabName }
  | { type: 'switchTab'; tab: TabName }
  | { type: 'modelsLoaded'; models: string[]; activeModel: string }
  | { type: 'modelChanged' }
  | { type: 'modelChangeError'; error: string }
  | { type: 'compressionStatusLoaded'; enabled: boolean }
  | { type: 'compressionStatsLoaded'; stats: CompressionStats | null }
  | { type: 'pluginsLoaded'; plugins: PluginState[] | null }
  | { type: 'pluginModeSet'; success: boolean; restartRequired: boolean; error: string | null };
```

**WebView → Extension:**
```typescript
type ExtensionMessage =
  | { command: 'refresh' }
  | { command: 'openSettings' }
  | { command: 'restartCompression' }
  | { command: 'togglePrivateMode' }
  | { command: 'loadModels' }
  | { command: 'changeModel'; model: string }
  | { command: 'loadCompressionStatus' }
  | { command: 'loadCompressionStats' }
  | { command: 'loadPlugins' }
  | { command: 'setPluginMode'; plugin: 'caveman' | 'ponytail'; mode: string };
```

---

## Plugin State (v0.3.1)

Source of truth: `~/.claude/settings.json` → `env` block (resolved via `os.homedir()`).
Managed by `SettingsService` (`src/settingsService.ts`). See ADR-008 in `design.md`.

```typescript
type ControllablePlugin = 'caveman' | 'ponytail';

interface PluginState {
  id: 'caveman' | 'ponytail' | 'tracing' | 'shunt';
  name: string;
  version?: string;          // "4.1.0" / "5.3.3" (controllable only)
  controllable: boolean;     // false for tracing/shunt (read-only "Managed")
  mode: string;              // current mode; 'on' | 'off' for read-only plugins
  modes?: string[];          // allowed modes (controllable only)
}

// Caveman modes:  ['caveman', 'manual', 'off']        → CAVEMAN_DEFAULT_MODE
// Ponytail modes: ['lite', 'full', 'ultra', 'off']    → PONYTAIL_DEFAULT_MODE
```

Rules:
- Only `CAVEMAN_DEFAULT_MODE` / `PONYTAIL_DEFAULT_MODE` are ever written.
- Writes are atomic (temp file + rename); a corrupt/unparseable settings.json is never overwritten.
- Tracing reflects `TRACE_TO_LANGSMITH`; Shunt reflects presence of `SHUNT_*` vars — both read-only.
- Changes apply only after the Elysia/Claude Code session restarts (see restart semantics in ADR-008).

---

## Color Thresholds

```typescript
interface Thresholds {
  healthy: {        // 🟢 Green
    min: 0;
    max: 45;       // Exclusive
    color: '#4ec9b0';
  };
  warning: {        // 🟡 Yellow
    min: 45;
    max: 85;       // Exclusive
    color: '#ffcc00';
  };
  critical: {      // 🔴 Red
    min: 85;
    max: 100;
    color: '#f14c4c';
  };
}
```

---

## File Paths

```typescript
interface FileStructure {
  // Source (TypeScript)
  'src/extension.ts': 'Entry point, command registration';
  'src/elysiaService.ts': 'CLI communication, parsing ★';
  'src/statusBarManager.ts': 'Status bar lifecycle';
  'src/detailsPanel.ts': 'Webview HTML/JS/CSS (Usage, Compression, Plugins tabs)';
  'src/settingsService.ts': 'Plugin state read/write to ~/.claude/settings.json (v0.3.1)';

  // Output (Compiled)
  'out/extension.js': 'Compiled entry point';
  'out/elysiaService.js': 'Compiled service';
  'out/statusBarManager.js': 'Compiled manager';
  'out/detailsPanel.js': 'Compiled panel';

  // Documentation
  'CLAUDE.md': 'Project map';
  'README.md': 'User documentation';
  'SETUP_GUIDE.md': 'Installation guide';
  'log.md': 'Development log';
  'architecture/': 'Architecture docs';
}
```

---

## Error Types

```typescript
interface ExtensionError {
  type: 'CONFIG_NOT_FOUND' | 'CLI_EXECUTION_FAILED' | 'PARSE_ERROR';
  message: string;
  details?: string;
}

// Common error messages
const Errors = {
  CONFIG_NOT_FOUND: 'Failed to fetch Elysia config',
  MODEL_CHANGE_FAILED: 'Failed to change model to {modelName}',
  COMPRESSION_RESTART_FAILED: 'Failed to restart compression',
  CLI_NOT_FOUND: 'elysia-code not found in PATH'
};
```

---

## Testing Data

### Valid Config
```
Version    : 0.3.0
Model      : kimi-k2.5
Private    : false
Workspace  : ws-inform-1a0500
Config ID  : pc-defaul-0c6289
LangSmith  : enabled
Status     : Active
Used       : $115.80 / $200.00
```

### Valid Models
```
Available models
-----------------
  kimi-k2.5  ← active
  zai.glm-5
  claude-sonnet-5
```

### Valid Model Change
```
OK  Model updated to zai.glm-5
Restart Claude Code to apply the change.
```

---

**Last Updated:** 2026-11-23  
**Maintained by:** Informa AI Team
