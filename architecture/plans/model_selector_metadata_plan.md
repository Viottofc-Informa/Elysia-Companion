---
type: Plan
title: Model Selector Metadata — Rich Rows with Detail Tooltips
description: BLAST plan to surface per-model metadata (context, auto-compact, pricing, best-for) in the Usage tab model selector
tags:
  - elysia
  - model-selector
  - usage-tab
  - plan
  - blast
generated: { by: "human:viottof", at: '2026-11-23T00:00:00Z' }
status: draft
---

# Model Selector Metadata — BLAST Plan

## 1. Blueprint (North Star)

### 1.1 Outcome

A user choosing a model in the Usage tab sees, for every model, what it costs, how
much context it holds, and what it is good at — without leaving VS Code and without
consulting `pilots.ai.informa.com/elysia-code/`. Today the dropdown shows bare model
IDs and nothing else.

### 1.2 The data-availability problem (drives the whole design)

`elysia-code --models` returns **names only**:

```
Available models
-----------------
  kimi-k2.7-code
  kimi-k3
  ...
  deepseek-v4.1-flash  ← active
```

Verified against `elysia-code.py` 0.3.12:

| Data | Exists in CLI? | Where | Exposed for all models? |
|------|----------------|-------|-------------------------|
| Model IDs | ✅ | `ALLOWED_MODELS` (line 202) | ✅ via `--models` |
| Context + auto-compact | ✅ | `MODEL_CONTEXT_LIMITS` (line ~650) | ❌ active model only (`--config`) |
| Input/output pricing | ✅ | `MODEL_COSTS` (line 667) | ❌ active model only (`--config`) |
| "Best for" description | ❌ | Not in CLI at all | ❌ — site curation only |

**Consequence:** per-model metadata must come from a catalog maintained in the
extension. The model *list* continues to come from `--models`, so a model added to
the gateway still appears and remains selectable.

### 1.3 Decisions (locked with user)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Rich row (2 lines) + `ⓘ` detail tooltip | Fits ~568px usable width; essentials visible without interaction |
| D2 | Curated `src/modelCatalog.ts` | Offline, no coupling to CLI internals; graceful fallback |
| D3 | Line 2 = numbers only; description in tooltip | Keeps the list scannable for cost/context comparison |
| D4 | "Model Information" card untouched | Surgical change; no redundant-fix scope creep |
| D5 | Haiku shows short tier + note | `1M ctx · $0.11 in / $0.55 out · up to 100K`; full tiers in tooltip |
| D6 | Preserve CLI order | Zero surprise for existing users; no divergence from CLI |
| D7 | Tooltip on hover + focus, with vertical flip | `position: fixed` escapes the dropdown's `overflow-y: auto` clipping |

### 1.4 Source of Truth

- **Model list + active model:** `elysia-code --models` (unchanged)
- **Per-model metadata:** `src/modelCatalog.ts`, verified 2026-11-23 against
  `https://pilots.ai.informa.com/elysia-code/` (site pricing table dated 19 Oct 2026)

### 1.5 Delivery Payload

Modified **Usage tab** model selector in `detailsPanel.ts`. No new tab, no new
command, no new webview↔extension message.

### 1.6 Behavioral Rules

- A model present in `--models` but absent from the catalog **must still render and
  remain selectable** — line 2 empty, `ⓘ` hidden. Never hide or drop a model.
- Never fabricate metadata. If the catalog has no entry, show nothing rather than a
  guess or a zero.
- The catalog's verification date is displayed in the dropdown footer so the data is
  not mistaken for live gateway output.
- Tooltip must not open on scroll (stale anchor position) and must close on scroll.

## 2. Data Schema

### 2.1 New types — `src/modelCatalog.ts`

```typescript
/** Per-side pricing. `short === long` for models with flat rates. */
export interface PriceTier {
  short: number;       // USD per 1M tokens, prompt ≤ threshold
  long: number;        // USD per 1M tokens, prompt > threshold
  threshold: number;   // token count where `long` applies; 0 = no tiering
}

export interface ModelMeta {
  label: string;        // "Kimi K3" — human-readable form
  bestFor: string;      // site "Best for" text; tooltip only
  context: number;      // tokens
  autoCompact: number;  // tokens
  input: PriceTier;
  output: PriceTier;
}
```

### 2.2 Catalog entries (13 models, v0.3.12)

Values transcribed from the site's model table. `claude-haiku-5-5` is the only
tiered entry (`threshold: 100_000`); all others use `threshold: 0`.

| ID | Context | Auto-compact | Input (short/long) | Output (short/long) |
|----|---------|--------------|--------------------|---------------------|
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

### 2.3 Helpers

```typescript
export function getModelMeta(id: string): ModelMeta | undefined;

/** 262144 → "262K"; 196608 → "196K"; 1048576 → "1M"; 1050000 → "1M" */
export function formatContext(tokens: number): string;

/** "$0.95 in / $4.00 out" | tiered: "$0.11 in / $0.55 out · up to 100K" */
export function formatInlinePrice(meta: ModelMeta): string;

export function hasTieredPricing(meta: ModelMeta): boolean;
```

**`formatContext` rule** — normalises the 1,048,576 vs 1,050,000 vs 1,000,000
inconsistency so the column reads uniformly:

- `tokens >= 1_000_000` → `(tokens / 1_000_000)` truncated to 1 decimal + `"M"` → `"1M"`
- otherwise → `Math.round(tokens / 1000)` + `"K"` → `"262K"`

### 2.4 Catalog delivery to the webview

The catalog is serialised into the webview HTML at template time, exactly as
`config` already is (see `detailsPanel.ts` `getHtml`). No new message type:

```typescript
const catalogJson = JSON.stringify(MODEL_CATALOG);
// → <script>const MODEL_CATALOG = ${catalogJson};</script>
```

## 3. Changes

### 3.1 `src/modelCatalog.ts` (new, ~130 lines)

Types, the 13-entry `MODEL_CATALOG`, and the four helpers above. Includes the
provenance comment (source URL + verification date).

### 3.2 `src/detailsPanel.ts` — CSS

| Selector | Change |
|----------|--------|
| `.model-item` | → `flex-direction: column; align-items: stretch; gap: 3px;` (was horizontal `space-between`) |
| `.model-item-head` | **new** — `display: flex; align-items: center; justify-content: space-between;` |
| `.model-item-meta` | **new** — `font-size: 11px; color: var(--vscode-desc-fg); font-variant-numeric: tabular-nums;` |
| `.model-info-btn` | **new** — borderless button, `cursor: help`, visible focus ring |
| `.model-dropdown` | `max-height: 300px` → `min(60vh, 520px)` |
| `.model-tooltip` | **new** — `position: fixed`, `z-index: 1000`, `max-width: 320px` |
| `.model-footer` | **new** — provenance line, `font-size: 10px`, muted |

`tabular-nums` on line 2 aligns prices vertically across rows — the detail that
makes the list read like a table without being one.

### 3.3 `src/detailsPanel.ts` — template

`displayModels()` builds each row as:

```html
<div class="model-item ${isActive ? 'selected' : ''}" onclick="selectModel('${id}')">
  <div class="model-item-head">
    <span class="model-item-name">${id}</span>
    ${isActive ? '<span class="model-item-badge">active</span>' : ''}
    ${meta ? `<button class="model-info-btn" aria-label="Details for ${meta.label}"
               onmouseenter="showModelTip(this,'${id}')" onmouseleave="hideModelTip()"
               onfocus="showModelTip(this,'${id}')" onblur="hideModelTip()">ⓘ</button>` : ''}
  </div>
  ${meta ? `<div class="model-item-meta">${formatContext(meta.context)} ctx · ${formatInlinePrice(meta)}</div>` : ''}
</div>
```

Note the badge and `ⓘ` share `.model-item-head`; the `ⓘ` is a real `<button>` so
keyboard focus works without extra ARIA wiring.

### 3.4 `src/detailsPanel.ts` — tooltip JS

Single reused `position: fixed` node appended to `document.body`, outside the
dropdown's scroll container:

```typescript
window.showModelTip = function (anchorEl, modelId) {
  const meta = MODEL_CATALOG[modelId];
  if (!meta) return;
  tip.innerHTML = buildTipHtml(meta);      // label, bestFor, context, compact, prices
  tip.classList.add('open');

  const a = anchorEl.getBoundingClientRect();
  const th = tip.offsetHeight, tw = tip.offsetWidth;

  // Flip above when it does not fit below
  tip.style.top = (window.innerHeight - a.bottom > th + 12)
    ? (a.bottom + 8) + 'px'
    : Math.max(8, a.top - th - 8) + 'px';

  // Right-align to the anchor, clamped to the viewport
  tip.style.left = Math.min(
    Math.max(8, a.right - tw),
    window.innerWidth - tw - 8
  ) + 'px';
};

window.hideModelTip = function () { tip.classList.remove('open'); };
```

`document.addEventListener('scroll', hideModelTip, true)` — capture phase, so
scrolling the dropdown closes the tooltip rather than leaving it at a stale anchor.

Tiered pricing (Haiku) renders both ranges in the tooltip — this is where the
detail that cannot fit on line 2 is resolved:

```
Input     $0.11 / 1M  (up to 100K prompt)
          $0.55 / 1M  (>100K prompt)
Output    $0.55 / 1M  (up to 100K prompt)
          $2.75 / 1M  (>100K prompt)
```

### 3.5 Untouched

`elysiaService.ts` (incl. `parseModelsOutput`), `extension.ts`, `package.json`,
`settingsService.ts`, the change-model confirmation flow, and all other Usage tab
cards. No new command, no new message type, no manifest change.

## 4. Verification

| # | Check | How |
|---|-------|-----|
| V1 | Compiles clean | `npm run compile` |
| V2 | All 13 models render with 2 lines | F5 → Usage tab → open dropdown |
| V3 | `ⓘ` shows full detail, not clipped | Hover top and bottom rows; confirm flip |
| V4 | Tooltip closes on dropdown scroll | Scroll with tooltip open |
| V5 | Haiku shows tiered pricing correctly | Row 2 note + both tiers in tooltip |
| V6 | Unknown model degrades gracefully | Temporarily add a fake ID to the catalog gap; confirm row renders with no `ⓘ` |
| V7 | Keyboard: Tab reaches `ⓘ`, focus opens tip | Tab through rows |
| V8 | Model change still works | Select a different model, confirm dialog, apply |
| V9 | Light and dark themes | Toggle VS Code theme |

## 5. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Catalog drifts as gateway adds/changes models | Medium | Models outside catalog still render and are selectable; verification date in footer; revisit on gateway changes |
| Pricing differs between site and actual gateway billing | Medium | Footer states source + date; CLI's own note says "rates may change" |
| Tooltip clipping in narrow panel | Low | `position: fixed` + viewport clamping; flip logic |
| Dropdown too tall on short viewports | Low | `min(60vh, 520px)` — user deferred fine-tuning |
| Unicode `ⓘ` renders inconsistently | Low | Verify on Windows; fallback to `?` glyph if broken |

## 6. Out of Scope

- Sorting or filtering the model list
- Grouping models by use case
- Removing or slimming the "Model Information" card (D4)
- A side-by-side comparison view
- Changes to `elysia-code.py` (a `--models --json` flag would be the durable fix;
  the catalog is shaped so the source can be swapped later without touching the UI)