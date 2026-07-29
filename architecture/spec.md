---
type: Specification
title: Elysia Companion - Data Contracts
description: JSON schemas, API contracts, and type definitions
tags:
  - specification
  - schema
  - types
  - contract
timestamp: '2026-07-29'
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

### Config Output

Example:
```
Elysia Config
--------------
Version    : 0.3.0
Model      : kimi-k2.5
Private    : false
Workspace  : ws-inform-1a0500
Config ID  : pc-defaul-0c6289
LangSmith  : enabled

Usage
--------------
Status     : Active
Used       : $117.4554 / $200.00
            [███████████░░░░░░░░░] 58.7%
Resets     : Monthly
Expires    : 2026-10-11

Compression
--------------
Status  : enabled
Log     : C:\Users\...\.elysia\compression.log
```

Parsed to:
```typescript
interface ElysiaConfig {
  version: string;           // "0.3.0"
  model: string;             // "kimi-k2.5"
  isPrivate: boolean;        // false
  workspace: string;           // "ws-inform-1a0500"
  configId: string;          // "pc-defaul-0c6289"
  langSmithEnabled: boolean; // true
  status: string;            // "Active"
  usedAmount: number;        // 117.4554
  totalAmount: number;       // 200.00
  percentage: number;        // 58.7
}
```

Parsing rules:
- Version: Line starts with "Version", extract after ":"
- Model: Line starts with "Model", extract after ":"
- Private: Line starts with "Private", compare to "true"
- Workspace: Line starts with "Workspace", extract after ":"
- Config ID: Line starts with "Config ID", extract after ":"
- LangSmith: Line starts with "LangSmith", check for "enabled"
- Status: Line starts with "Status", extract after ":"
- Usage: Line starts with "Used", regex `\$([\d.]+)\s*/\s*\$([\d.]+)`
- Percentage: Calculated: `(usedAmount / totalAmount) * 100`

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

## VS Code Extension API Contracts

### Registered Commands

```typescript
// Commands registered in extension.ts
interface Commands {
  'elysiaUsage.refresh': () => Promise<void>;
  'elysiaUsage.showDetails': () => Promise<void>;
  'elysiaUsage.openSettings': () => void;
  'elysiaUsage.restartCompression': () => Promise<void>;
  'elysiaUsage.getModels': () => Promise<ModelsResponse>;
  'elysiaUsage.changeModel': (modelName: string) => Promise<void>;
}
```

### Status Bar Item

```typescript
interface StatusBarItem {
  text: string;           // "🟢 $XXX.XX / XX.X%"
  tooltip: MarkdownString;  // Hover content
  command: string;        // "elysiaUsage.showDetails"
  backgroundColor?: ThemeColor;
}
```

### WebView Communication

**Extension → WebView:**
```typescript
type WebViewMessage =
  | { type: 'init'; extensionUri: string }
  | { type: 'modelsLoaded'; models: string[]; activeModel: string }
  | { type: 'modelChanged' }
  | { type: 'modelChangeError'; error: string };
```

**WebView → Extension:**
```typescript
type ExtensionMessage =
  | { command: 'refresh' }
  | { command: 'openSettings' }
  | { command: 'restartCompression' }
  | { command: 'loadModels' }
  | { command: 'changeModel'; model: string };
```

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
  'src/detailsPanel.ts': 'Webview HTML/JS/CSS';

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

**Last Updated:** 2026-07-29  
**Maintained by:** Informa AI Team
