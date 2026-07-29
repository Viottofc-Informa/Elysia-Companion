# Elysia Companion — Project Map

> **Project Type:** VS Code Extension  
> **Status:** ✅ Production Ready  
> **Last Updated:** 2026-07-29  
> **BLAST Phase:** 5 (Trigger - Deployed)

---

## 1. North Star

### 1.1 Outcome
Enable Elysia users to monitor usage, manage models, and control services directly from VS Code without leaving their editor.

### 1.2 Integrations
- **Elysia CLI**: `elysia-code` command-line tool
- **VS Code API**: Status bar, Webview panels, Commands
- **Local System**: Windows/macOS/Linux process execution

### 1.3 Source of Truth
- **Primary**: `elysia-code --config` (live data)
- **Models**: `elysia-code --models` (available models)
- **Settings**: VS Code `settings.json`

### 1.4 Delivery
- **Package**: `.vsix` file for manual installation
- **Marketplace**: VS Code Extension Marketplace (future)
- **Dashboard**: Webview panel embedded in VS Code

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
  version: string;           // "0.3.0"
  model: string;             // "kimi-k2.5"
  isPrivate: boolean;        // false
  workspace: string;           // "ws-inform-1a0500"
  configId: string;          // "pc-defaul-0c6289"
  langSmithEnabled: boolean; // true
  status: string;            // "Active"
  usedAmount: number;        // 117.45
  totalAmount: number;       // 200.00
  percentage: number;        // 58.72
}
```

### 2.3 Models Response

```typescript
interface ModelsResponse {
  models: string[];       // ["zai.glm-5", "kimi-k2.5", "claude-sonnet-5", ...]
  activeModel: string;    // "kimi-k2.5"
}
```

---

## 3. File Structure

```
elysia-companion/
├── .vscode/
│   └── launch.json           # Debug configuration
├── out/
│   ├── extension.js          # Compiled entry point
│   ├── elysiaService.js      # Core service
│   ├── statusBarManager.js   # UI: Status bar
│   └── detailsPanel.js       # UI: Webview
├── src/
│   ├── extension.ts          # Entry point, command registration
│   ├── elysiaService.ts      # CLI communication, parsing ★
│   ├── statusBarManager.ts   # Status bar lifecycle
│   ├── detailsPanel.ts       # Webview HTML/JS/CSS
│   └── test/
│       └── runTest.ts        # Test runner
├── architecture/
│   ├── design.md             # Why spawn vs exec
│   └── spec.md               # Data contracts
├── handoffs/
│   ├── handoff_change_model_test.md      # Model change debugging
│   └── handoff_change_model_test_v2.md   # Results & fixes
├── .vscodeignore             # Package exclusions
├── CHANGELOG.md              # Version history
├── CLAUDE.md                # ← This file
├── LICENSE                  # MIT
├── package.json             # Extension manifest
├── README.md                # User documentation
├── SETUP_GUIDE.md           # Installation guide
└── tsconfig.json            # TypeScript config
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
| Dashboard | ✅ | Webview with buttons |
| Restart Service | ✅ | Fixed compression restart with execAsync |
| Change Model | ✅ | Working after fixing exec pattern |
| Model Selector | ✅ | Dropdown with active badge |
| Settings | ✅ | Configurable thresholds |
| Auto-refresh | ✅ | Every 5 minutes |

### 5.2 Known Limitations

| Issue | Workaround | Priority |
|-------|------------|----------|
| Requires reload after model change | ✓ Auto-suggest "Reload Window" | Low |
| Does not detect model changes from CLI | ✓ Manual refresh | Low |
| Compression restart disconnects briefly | ✓ Expected behavior | Info |

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

### 6.3 Test Commands

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
- [ ] Add tests (currently 0% coverage)
- [ ] Implement diagnostic health check
- [ ] Add usage history chart (trend over time)
- [ ] Support multiple Elysia workspaces

---

**Maintained by:** Informa AI Team  
**Publisher:** fernando.viotto@informa.com  
**License:** MIT
