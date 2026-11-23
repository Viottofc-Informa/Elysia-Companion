/**
 * Per-model metadata catalog for the Usage tab model selector.
 *
 * WHY THIS FILE EXISTS
 * `elysia-code --models` returns model IDs only — no context window, no pricing,
 * no description. Those values do exist inside the CLI (MODEL_CONTEXT_LIMITS and
 * MODEL_COSTS in elysia-code.py, v0.3.12) but only the *active* model's values are
 * printed, via `--config`. The "Best for" descriptions are not in the CLI at all.
 *
 * So metadata is curated here while the model *list* continues to come from
 * `--models`. A model added to the gateway but missing from this catalog still
 * renders and stays selectable — it simply shows no second line or ⓘ button.
 * Never fabricate an entry: absent data must render as absent, not as a guess.
 *
 * SOURCE: https://pilots.ai.informa.com/elysia-code/
 * Verified: 2026-11-23 (site pricing table dated 19 Oct 2026)
 * The site notes rates may change. Re-verify when the gateway model lineup changes.
 *
 * FIDELITY OF THIS DATA
 * The numeric fields — context, autoCompact, input, output — are transcribed
 * exactly and are the values to trust. The `label` and `bestFor` prose is adapted,
 * not copied: the site prefixes the model name and renders the same cell with
 * inconsistent wording between requests, so these strings are condensed to a
 * consistent voice. Nothing here is invented, but do not treat the prose as a
 * verbatim citation. Context/pricing are what a user makes decisions on.
 */

/** Per-side pricing in USD per 1M tokens. `short === long` for flat-rate models. */
export interface PriceTier {
  /** Rate for prompts at or below `threshold` tokens. */
  short: number;
  /** Rate for prompts above `threshold` tokens. Equal to `short` when untiered. */
  long: number;
  /** Token count above which `long` applies. 0 means no tiering. */
  threshold: number;
}

export interface ModelMeta {
  /** Human-readable name shown as the tooltip heading, e.g. "Kimi K3". */
  label: string;
  /**
   * What the model is good for, shown in the tooltip.
   *
   * Adapted from the site's "Best for" column rather than copied verbatim: the
   * site renders this text inconsistently and prefixes the model name, which the
   * tooltip already shows as its heading. Wording is condensed, never invented —
   * see the fidelity note in the file header.
   */
  bestFor: string;
  /** Maximum context window, in tokens. */
  context: number;
  /** Token count at which Claude Code auto-compacts the conversation. */
  autoCompact: number;
  input: PriceTier;
  output: PriceTier;
}

/** Flat-rate helper — `short === long`, no tiering. */
function flat(rate: number): PriceTier {
  return { short: rate, long: rate, threshold: 0 };
}

/** Tiered helper — `long` applies above `threshold` tokens (prompt-length conditional). */
function tiered(short: number, long: number, threshold: number): PriceTier {
  return { short, long, threshold };
}

/** Token count at which claude-haiku-5-5 switches to its long-prompt rate. */
const HAIKU_TIER_THRESHOLD = 100_000;

export const MODEL_CATALOG: Record<string, ModelMeta> = {
  'kimi-k2.7-code': {
    label: 'Kimi K2.7 Code',
    bestFor: 'Cheap, efficient agentic coding; finishes long multi-step engineering tasks with fewer reasoning tokens.',
    context: 262_144,
    autoCompact: 220_000,
    input: flat(0.95),
    output: flat(4.00)
  },
  'kimi-k3': {
    label: 'Kimi K3',
    bestFor: 'Frontier-level reasoning coding; sustains hours-long autonomous work across huge codebases.',
    context: 1_048_576,
    autoCompact: 900_000,
    input: flat(3.30),
    output: flat(16.50)
  },
  'zai.glm-5.3': {
    label: 'GLM-5.3',
    bestFor: 'Best-in-class terminal agents and cyber defense; finds exploits and vulnerabilities at state-of-the-art rates.',
    context: 1_048_576,
    autoCompact: 900_000,
    input: flat(1.40),
    output: flat(4.40)
  },
  'gpt-5.6-luna': {
    label: 'GPT-5.6 Luna',
    bestFor: "OpenAI's high-volume, latency-sensitive model.",
    context: 1_050_000,
    autoCompact: 900_000,
    input: flat(0.40),
    output: flat(1.80)
  },
  'gpt-5.3-codex': {
    label: 'GPT 5.3 Codex',
    bestFor: 'OpenAI coding-optimised model.',
    context: 400_000,
    autoCompact: 340_000,
    input: flat(1.75),
    output: flat(14.00)
  },
  'gpt-5-4': {
    label: 'GPT-5.4',
    bestFor: "OpenAI's top-tier model.",
    context: 1_050_000,
    autoCompact: 900_000,
    input: flat(2.50),
    output: flat(15.00)
  },
  'gpt-5-4-mini': {
    label: 'GPT-5.4 mini',
    bestFor: 'Cost-efficient OpenAI model.',
    context: 400_000,
    autoCompact: 340_000,
    input: flat(0.75),
    output: flat(4.50)
  },
  'claude-sonnet-5-5': {
    label: 'Claude Sonnet 5.5',
    bestFor: 'Latest Claude model, top-tier intelligence and coding capability.',
    context: 1_000_000,
    autoCompact: 850_000,
    input: flat(2.20),
    output: flat(11.00)
  },
  'claude-haiku-5-5': {
    label: 'Claude Haiku 5.5',
    // The only model with prompt-length-conditional pricing.
    bestFor: 'Fastest and most cost-efficient Claude, good for quick edits.',
    context: 1_000_000,
    autoCompact: 850_000,
    input: tiered(0.11, 0.55, HAIKU_TIER_THRESHOLD),
    output: tiered(0.55, 2.75, HAIKU_TIER_THRESHOLD)
  },
  'deepseek-v4': {
    label: 'DeepSeek V4 Pro',
    bestFor: 'Open-weight model for code generation and technical reasoning.',
    context: 1_048_576,
    autoCompact: 900_000,
    input: flat(1.74),
    output: flat(3.48)
  },
  'deepseek-v4.1-flash': {
    label: 'DeepSeek V4.1 Flash',
    bestFor: 'Fast, low-latency open-weight model for code and chat; default model.',
    context: 1_048_576,
    autoCompact: 900_000,
    input: flat(0.37),
    output: flat(1.50)
  },
  'minimax-m2.5': {
    label: 'MiniMax M2.5',
    bestFor: 'Efficient, cost-effective inference for high-throughput tasks.',
    context: 196_608,
    autoCompact: 170_000,
    input: flat(0.30),
    output: flat(1.20)
  },
  'gpt-6.1-sol': {
    label: 'GPT-6.1 Sol',
    bestFor: "OpenAI's latest flagship model, top-tier reasoning and complex problem solving.",
    context: 272_000,
    autoCompact: 230_000,
    input: flat(2.00),
    output: flat(10.00)
  }
};

/** Metadata for a model ID, or `undefined` when the catalog has no entry for it. */
export function getModelMeta(id: string): ModelMeta | undefined {
  return Object.prototype.hasOwnProperty.call(MODEL_CATALOG, id)
    ? MODEL_CATALOG[id]
    : undefined;
}

/**
 * Compact context-window label for the list's second line.
 *
 * Normalises a source inconsistency: the gateway reports 1,048,576 / 1,050,000 /
 * 1,000,000 for what users think of as "1M". Those would render as three
 * different values, so anything at or above 1M collapses to a single "M" form.
 *
 *   262_144   → "262K"
 *   196_608   → "196K"  (floored — never overstated)
 *   400_000   → "400K"
 *   1_048_576 → "1M"
 *   1_050_000 → "1M"
 *   1_000_000 → "1M"
 */
export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = Math.trunc((tokens / 1_000_000) * 10) / 10;
    return `${millions}M`;
  }
  // Floor, not round: context is a capacity, and rounding up would overstate what
  // the model can hold. 196_608 must read "196K", not "197K".
  return `${Math.floor(tokens / 1000)}K`;
}

/** `100000` → "100K"; `900000` → "900K". Used for the haiku tier note. */
function formatTokenCount(tokens: number): string {
  // Same rule as formatContext, including the flooring rationale — keep the two
  // in step so the list and the tooltip can never disagree on a token count.
  return formatContext(tokens);
}

/** `0.95` → "$0.95". Two decimals, matching the site's pricing table. */
export function formatUsd(rate: number): string {
  return `$${rate.toFixed(2)}`;
}

/** True when the model's rate depends on prompt length (only claude-haiku-5-5 today). */
export function hasTieredPricing(meta: ModelMeta): boolean {
  return meta.input.threshold > 0 || meta.output.threshold > 0;
}

/**
 * Second-line price summary for the model list.
 *
 *   flat:   "$0.95 in / $4.00 out"
 *   tiered: "$0.11 in / $0.55 out · up to 100K"
 *
 * Tiered models show their short-prompt rate, with a note that a higher rate
 * applies above the threshold. The tooltip carries both ranges — the list must
 * stay one fixed-width column, so it cannot render two rates inline.
 */
export function formatInlinePrice(meta: ModelMeta): string {
  const base = `${formatUsd(meta.input.short)} in / ${formatUsd(meta.output.short)} out`;
  if (!hasTieredPricing(meta)) {
    return base;
  }
  // Use the input side's threshold; both sides are tiered together in practice.
  const threshold = meta.input.threshold > 0 ? meta.input.threshold : meta.output.threshold;
  return `${base} · up to ${formatTokenCount(threshold)}`;
}

/** `1048576` → "1,048,576 tokens". Full precision for the tooltip. */
export function formatTokensExact(tokens: number): string {
  return `${tokens.toLocaleString('en-US')} tokens`;
}

/**
 * Price rows for the tooltip. One line for flat rates, two for tiered ones —
 * this is where the range that cannot fit on the list's second line is resolved.
 *
 *   flat:   ["$3.30 / 1M tokens"]
 *   tiered: ["$0.11 / 1M  (up to 100K prompt)",
 *            "$0.55 / 1M  (over 100K prompt)"]
 */
export function formatPriceLines(tier: PriceTier): string[] {
  if (tier.threshold <= 0) {
    return [`${formatUsd(tier.short)} / 1M tokens`];
  }
  const limit = formatTokenCount(tier.threshold);
  return [
    `${formatUsd(tier.short)} / 1M  (up to ${limit} prompt)`,
    `${formatUsd(tier.long)} / 1M  (over ${limit} prompt)`
  ];
}

/**
 * Fully-rendered, serialisable view of one model, for the webview.
 *
 * The webview builds each row as a string in browser JS, so it cannot call the
 * TypeScript helpers above. Precomputing the display strings here keeps all
 * formatting in one place instead of duplicating it in client-side JS.
 */
export interface ModelMetaView {
  /** Tooltip heading. */
  label: string;
  /** Second line of the list row, e.g. "262K ctx · $0.95 in / $4.00 out". */
  line2: string;
  /** Tooltip body: what the model is good for. */
  bestFor: string;
  contextText: string;
  autoCompactText: string;
  inputLines: string[];
  outputLines: string[];
}

function toView(meta: ModelMeta): ModelMetaView {
  return {
    label: meta.label,
    line2: `${formatContext(meta.context)} ctx · ${formatInlinePrice(meta)}`,
    bestFor: meta.bestFor,
    contextText: formatTokensExact(meta.context),
    autoCompactText: formatTokensExact(meta.autoCompact),
    inputLines: formatPriceLines(meta.input),
    outputLines: formatPriceLines(meta.output)
  };
}

/** View models for every catalog entry, keyed by model ID. Safe to JSON.stringify. */
export function buildCatalogView(): Record<string, ModelMetaView> {
  const view: Record<string, ModelMetaView> = {};
  for (const id of Object.keys(MODEL_CATALOG)) {
    view[id] = toView(MODEL_CATALOG[id]);
  }
  return view;
}