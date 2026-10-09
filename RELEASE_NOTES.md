# Release Notes v0.2.0 — Compression Stats Tab

**Release Date:** 2026-10-09  
**Download:** [elysia-companion-0.2.0.vsix](releases/elysia-companion-0.2.0.vsix)

---

## 🎯 What's New

### Compression Stats Dashboard

A brand new **Compression** tab providing detailed insights into Elysia's compression performance:

#### Session Savings
Real-time metrics for current session:
- **Tokens Saved:** 12,194 tokens saved (2.03% compression rate)
- **USD Saved:** $0.04 saved this session
- **Requests:** 15 requests processed

#### Lifetime Savings
Cumulative statistics across all sessions:
- **Total Tokens Saved:** 32.1M tokens
- **Total USD Saved:** $37.45
- **Total Requests:** 10,912

#### Top Projects (Collapsible)
Table showing top 5 projects by compression efficiency:
| Project | Requests | Tokens Saved | Savings % | USD Saved |
|---------|----------|--------------|-----------|-----------|
| ai-workspace | 10,394 | 30.9M | 3.92% | $37.45 |

#### Top Models (Collapsible)
Table showing top 5 models by compression:
| Model | Requests | Tokens Saved | Savings % |
|-------|----------|--------------|-----------|
| deepseek-v4 | 1,080 | 8.9M | 6.18% |
| deepseek-v4.1-flash | 25 | 209K | 5.15% |

#### Recent Requests (Collapsible)
Detailed cards for last 5 requests showing:
- Request ID and timestamp
- Model used
- Original tokens → Optimized tokens
- Tokens saved + percentage
- Applied transforms (e.g., `anthropic:tool_schema_compaction`)

---

## 🏗️ Architecture Changes

### New Tab Structure
- **Usage Tab:** Model selector (top), Usage Summary, Configuration, Actions (bottom)
- **Compression Tab:** Status cards, Session/Lifetime savings, collapsible tables

### New Service Methods
- `fetchCompressionStats()` — Calls `elysia-code --compression-stats --json`
- `parseCompressionStats(raw)` — Transforms raw JSON into typed structure

### New Interfaces
```typescript
CompressionStats {
  enabled: boolean;
  port: number;
  mode: string;
  session: CompressionSession;
  lifetime: CompressionLifetime;
  projects: Record<string, ProjectStats>;
  byModel: Record<string, ModelStats>;
  recentRequests: RecentRequest[];
}
```

---

## 📥 Installation

### Quick Install

```powershell
# Download directly
code --install-extension https://github.com/Viottofc-Informa/Elysia-Companion/releases/download/v0.2.0/elysia-companion-0.2.0.vsix
```

### Manual Install

1. Download [elysia-companion-0.2.0.vsix](releases/elysia-companion-0.2.0.vsix)
2. Run: `code --install-extension elysia-companion-0.2.0.vsix`
3. Reload VS Code

---

## 🐛 Bug Fixes

- **Model Selector:** Fixed position at top of Usage tab for easier access
- **Action Buttons:** Available in both tabs (Usage and Compression)
- **Tab Navigation:** Simplified to 2 tabs instead of 3 for better UX

---

## 🔮 Coming Next

- [ ] VS Code Marketplace publication
- [ ] Usage history chart (trend over time)
- [ ] Compression efficiency graph
- [ ] Export stats to CSV
- [ ] Keyboard shortcuts for tab switching

---

## 📝 Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

---

**Maintained by:** Informa AI Team  
**License:** MIT
