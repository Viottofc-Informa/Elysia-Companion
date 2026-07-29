---
type: Architecture
title: Elysia Companion - Design Decisions
description: Architecture Decision Records (ADRs) and design rationale
tags:
  - architecture
  - design
  - adr
  - decisions
timestamp: '2026-07-29'
---

# Elysia Companion — Architecture Design

## Architecture Decision Records (ADRs)

---

## ADR-001: Use VS Code Extension API

### Status
✅ Accepted

### Context
Need to integrate Elysia monitoring into developer workflow.

### Decision
Build as VS Code extension using the Extension API.

### Consequences
- **Pros:**
  - Native integration with editor
  - Status bar API for persistent display
  - Webview API for custom dashboards
  - Command palette integration
- **Cons:**
  - VS Code specific (not portable to other editors)
  - Requires TypeScript/JavaScript knowledge

---

## ADR-002: Use spawn/exec for CLI Communication

### Status
✅ Accepted (with modifications)

### Context
Need to execute `elysia-code` CLI commands from the extension.

### Decision
Use `child_process.spawn()` for streaming output, `execAsync` for simple commands.

### Evolution
Initially used only `spawn()`, but discovered argument parsing issues with model names containing special characters. Added `execAsync` specifically for `changeModel()` command.

### Consequences
- **Pros:**
  - `spawn`: Real-time output capture
  - `exec`: Better shell integration for quoted arguments
- **Cons:**
  - `spawn`: Manual argument parsing error-prone
  - `exec`: Buffer size limitations (not an issue here)

### Pattern
```typescript
// Streaming/long-running → spawn
executeCommand('elysia-code --config')

// Simple/quoted arguments → exec
execAsync('elysia-code --model "zai.glm-5"')
```

---

## ADR-003: WebView for Dashboard

### Status
✅ Accepted

### Context
Need rich UI for dashboard (progress bars, buttons, model dropdown).

### Decision
Use VS Code Webview API instead of native panels.

### Consequences
- **Pros:**
  - Full HTML/CSS/JS control
  - Matches VS Code theme via CSS variables
  - Can embed interactive elements (buttons, dropdowns)
- **Cons:**
  - Requires bi-directional message passing
  - No direct access to VS Code APIs from WebView

### Implementation
See `src/detailsPanel.ts` for Webview ↔ Extension communication pattern.

---

## ADR-004: Lighthouse Color Thresholds

### Status
✅ Accepted

### Context
Original thresholds (75%/90%) didn't match actual usage patterns.

### Decision
Changed to 45% / 85% thresholds based on data.

### Rationale
- At 45%, user has consumed less than half — fits "warning" definition
- At 85%, only 15% remains — early critical warning
- Original 75% left too little reaction time before hitting limits

### Visual Design
- 🟢 Green: < 45% — Healthy, continue normal usage
- 🟡 Yellow: 45-85% — Monitor carefully, consider efficiency
- 🔴 Red: > 85% — Critical, reduce usage or request increase

---

## ADR-005: Normalized String Matching

### Status
✅ Accepted

### Context
Elysia CLI output has inconsistent formatting (two spaces, special characters, Unicode arrows).

### Decision
Normalize output before pattern matching:
```typescript
const normalized = output
  .toLowerCase()
  .replace(/\s+/g, ' ');  // Collapse multiple spaces
```

### Consequences
- **Pros:**
  - Matches despite CLI formatting quirks
  - Case-insensitive (handles "OK" and "ok")
- **Cons:**
  - Slightly more processing (negligible)
  - Must test against actual CLI output

### Usage
Applied in `restartCompression()` and `changeModel()` verification.

---

## ADR-006: Configuration via VS Code Settings

### Status
✅ Accepted

### Context
Users need to configure CLI path, thresholds, refresh intervals.

### Decision
Use VS Code `settings.json` with `contributes.configuration` in `package.json`.

### Consequences
- **Pros:**
  - Native VS Code settings UI
  - User-level and workspace-level settings
  - Type validation via JSON schema
- **Cons:**
  - Requires extension reload for some changes

---

## Rejected Alternatives

### ❌ TreeView for Model Selector
Initially planned to use VS Code TreeView API for model selection. Rejected because Webview offers more flexible styling and easier interaction patterns.

### ❌ WebSocket for Live Updates
Considered WebSocket connection to Elysia service for real-time updates. Rejected because `elysia-code` doesn't expose WebSocket API; polling every 5 minutes sufficient.

### ❌ Separate Backend Service
Considered building Node.js backend to wrap CLI. Rejected as unnecessary overhead; direct CLI execution sufficient.

---

## Technical Standards

### Language
- **TypeScript** — Primary language
- **ES2022** — Target for compiled output

### Libraries
- `child_process` — CLI communication
- `vscode` — Extension API

### Patterns
- **Service Pattern**: `ElysiaService` encapsulates all CLI logic
- **Manager Pattern**: `StatusBarManager` handles UI lifecycle
- **Panel Pattern**: `DetailsPanel` for Webview management

---

## Future Considerations

### Potential ADRs

#### ADR-TBD: Support Multiple Workspaces
Consider supporting multiple Elysia workspaces simultaneously.

#### ADR-TBD: Usage History Graph
Consider adding trend charts for usage over time.

#### ADR-TBD: Marketplace Distribution
Consider publishing to VS Code Marketplace vs. manual `.vsix` distribution.

---

**Last Updated:** 2026-07-29  
**Maintained by:** Informa AI Team
