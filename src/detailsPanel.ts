import * as vscode from 'vscode';
import { ElysiaConfig } from './elysiaService';

import { ElysiaService } from './elysiaService';

export class DetailsPanel {
  private static currentPanel: DetailsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private elysiaService: ElysiaService | undefined;

  private constructor(config: ElysiaConfig, extensionUri: vscode.Uri, elysiaService?: ElysiaService) {
    this.elysiaService = elysiaService;
    this.panel = vscode.window.createWebviewPanel(
      'elysiaUsageDetails',
      'Elysia-Code Management Panel',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.webview.html = this.getWebviewContent(config);

    // Store extension URI for commands
    this.panel.webview.postMessage({ type: 'init', extensionUri: extensionUri.toString() });

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'refresh':
            await vscode.commands.executeCommand('elysiaUsage.refresh');
            // Also refresh compression status
            try {
              if (this.elysiaService) {
                const compressionStatus = await this.elysiaService.getCompressionStatus();
                this.panel.webview.postMessage({
                  type: 'compressionStatusLoaded',
                  enabled: compressionStatus.enabled
                });
              }
            } catch (err) {
              // Silently fail - not critical
            }
            break;
          case 'loadCompressionStatus':
            // Get compression status and send back to webview
            try {
              if (this.elysiaService) {
                const compressionStatus = await this.elysiaService.getCompressionStatus();
                this.panel.webview.postMessage({
                  type: 'compressionStatusLoaded',
                  enabled: compressionStatus.enabled
                });
              }
            } catch (err) {
              this.panel.webview.postMessage({
                type: 'compressionStatusLoaded',
                enabled: false
              });
            }
            break;
          case 'openSettings':
            await vscode.commands.executeCommand('elysiaUsage.openSettings');
            break;
          case 'restartCompression':
            await vscode.commands.executeCommand('elysiaUsage.restartCompression');
            break;
          case 'loadModels':
            // Get models from extension and send back to webview
            try {
              const models = await vscode.commands.executeCommand('elysiaUsage.getModels') as { models: string[], activeModel: string };
              this.panel.webview.postMessage({
                type: 'modelsLoaded',
                models: models.models,
                activeModel: models.activeModel
              });
            } catch (err) {
              this.panel.webview.postMessage({
                type: 'modelsLoaded',
                models: [],
                activeModel: 'unknown'
              });
            }
            break;
          case 'togglePrivateMode':
            console.log('[DetailsPanel] Toggling private mode');
            try {
              await vscode.commands.executeCommand('elysiaUsage.togglePrivateMode');
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              console.log(`[DetailsPanel] Error toggling private mode: ${errorMsg}`);
            }
            break;
          case 'changeModel':
            console.log(`[DetailsPanel] Changing model to: ${message.model}`);
            try {
              const result = await vscode.commands.executeCommand('elysiaUsage.changeModel', message.model);
              console.log(`[DetailsPanel] Model change result: ${result}`);

              // After changing model, trigger restart
              console.log('[DetailsPanel] Triggering restart...');
              await vscode.commands.executeCommand('elysiaUsage.restartCompression');

              console.log('[DetailsPanel] Model change completed successfully');
              this.panel.webview.postMessage({ type: 'modelChanged' });

              // Show success notification
              vscode.window.showInformationMessage(
                `✅ Model changed to ${message.model} and Elysia restarted successfully!`,
                'Reload Window'
              ).then(selection => {
                if (selection === 'Reload Window') {
                  vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
              });
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              console.log(`[DetailsPanel] Error changing model: ${errorMsg}`);
              this.panel.webview.postMessage({ type: 'modelChangeError', error: errorMsg });
              vscode.window.showErrorMessage(`Failed to change model: ${errorMsg}`);
            }
            break;
        }
      },
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static show(config: ElysiaConfig, extensionUri: vscode.Uri, elysiaService?: ElysiaService): void {
    if (DetailsPanel.currentPanel) {
      DetailsPanel.currentPanel.update(config);
      DetailsPanel.currentPanel.panel.reveal();
    } else {
      DetailsPanel.currentPanel = new DetailsPanel(config, extensionUri, elysiaService);
    }
  }

  public update(config: ElysiaConfig): void {
    this.panel.webview.html = this.getWebviewContent(config);
  }

  private getWebviewContent(config: ElysiaConfig): string {
    const percentage = config.percentage;
    const progressWidth = Math.min(percentage, 100);

    // Determine color based on usage
    let progressColor = '#4ec9b0';
    let statusText = 'Healthy';
    let statusClass = 'healthy';

    if (percentage >= 90) {
      progressColor = '#f14c4c';
      statusText = 'Critical';
      statusClass = 'critical';
    } else if (percentage >= 75) {
      progressColor = '#ffcc00';
      statusText = 'Warning';
      statusClass = 'warning';
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elysia-Code Management Panel</title>
    <style>
        /* Import Google Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Aleo:wght@400;700&family=Open+Sans:wght@400;600;700&display=swap');

        /* Light Mode - Default (Informa Design System) */
        :root {
            /* Colors - Informa Light Mode */
            --color-primary: #0d6efd;
            --color-primary-hover: #002244;
            --color-secondary: #6cb5ff;
            --color-indigo: #002244;
            --color-text: #002244;
            --color-text-secondary: #666666;
            --color-text-muted: #51626f;
            --color-bg: #ffffff;
            --color-bg-card: #fafafa;
            --color-bg-input: #ffffff;
            --color-border: #e0e8eb;
            --color-border-focus: #0d6efd;

            /* Semantic colors */
            --color-success: #33D7C8;
            --color-success-text: #00786e;
            --color-success-bg: rgba(51, 215, 200, 0.15);
            --color-warning: #EEAF00;
            --color-warning-text: #B05223;
            --color-warning-bg: rgba(238, 175, 0, 0.15);
            --color-error: #FF547C;
            --color-error-text: #BF1B4F;
            --color-error-bg: rgba(255, 84, 124, 0.15);

            /* Typography */
            --font-heading: 'Aleo', serif;
            --font-body: 'Open Sans', sans-serif;

            /* VS Code overrides - Informa Light */
            --vscode-bg: #ffffff;
            --vscode-fg: #002244;
            --vscode-panel-bg: #fafafa;
            --vscode-panel-border: #e0e8eb;
            --vscode-input-bg: #ffffff;
            --vscode-desc-fg: #666666;
            --vscode-button-bg: #0d6efd;
            --vscode-button-fg: #ffffff;
            --vscode-button-secondary-bg: #ffffff;
            --vscode-button-secondary-fg: #002244;
            --vscode-focus-border: #0d6efd;
            --vscode-dropdown-bg: #ffffff;
            --vscode-list-hover: rgba(13, 110, 253, 0.1);
            --vscode-list-active: rgba(13, 110, 253, 0.15);
        }

        /* Dark Mode - Informa Design System (detected via VS Code theme kind) */
        body.vscode-dark {
            --color-primary: #3b9eff;
            --color-primary-hover: #6cb5ff;
            --color-indigo: #AAE6FF;
            --color-text: #e8f4ff;
            --color-text-secondary: #a8c5e0;
            --color-text-muted: #7a9bb8;
            --color-bg: #0d1b2a;
            --color-bg-card: #1b2838;
            --color-bg-input: #1b2838;
            --color-border: #2a3a4d;
            --color-border-focus: #3b9eff;

            /* Semantic colors adapted for dark */
            --color-success: #33D7C8;
            --color-success-text: #33D7C8;
            --color-success-bg: rgba(51, 215, 200, 0.15);
            --color-warning: #f5c842;
            --color-warning-text: #f5c842;
            --color-warning-bg: rgba(245, 200, 66, 0.15);
            --color-error: #ff7a9a;
            --color-error-text: #ff7a9a;
            --color-error-bg: rgba(255, 122, 154, 0.15);

            /* VS Code overrides - Informa Dark */
            --vscode-bg: #0d1b2a;
            --vscode-fg: #e8f4ff;
            --vscode-panel-bg: #1b2838;
            --vscode-panel-border: #2a3a4d;
            --vscode-input-bg: #1b2838;
            --vscode-desc-fg: #a8c5e0;
            --vscode-button-bg: #3b9eff;
            --vscode-button-fg: #0d1b2a;
            --vscode-button-secondary-bg: #1b2838;
            --vscode-button-secondary-fg: #e8f4ff;
            --vscode-focus-border: #3b9eff;
            --vscode-dropdown-bg: #1b2838;
            --vscode-list-hover: rgba(59, 158, 255, 0.1);
            --vscode-list-active: rgba(59, 158, 255, 0.2);
        }

        /* High Contrast Dark */
        body.vscode-high-contrast {
            --color-bg: #000000;
            --color-bg-card: #000000;
            --color-text: #ffffff;
            --vscode-panel-border: #ffffff;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-body);
            font-size: 14px;
            line-height: 1.5;
            color: var(--vscode-fg);
            background: var(--vscode-bg);
            padding: 24px;
            margin: 0;
            transition: background 0.3s ease, color 0.3s ease;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
        }

        /* Header */
        .header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        h1 {
            font-family: var(--font-heading);
            font-size: 28px;
            font-weight: 700;
            color: var(--vscode-fg);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-subtitle {
            font-size: 14px;
            color: var(--vscode-desc-fg);
        }

        /* Card */
        .card {
            background: var(--vscode-panel-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 24px;
            margin-bottom: 16px;
        }

        .section-title {
            font-family: var(--font-heading);
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 16px;
            color: var(--vscode-fg);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Status Badge */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .status-badge.healthy {
            background: rgba(51, 215, 200, 0.15);
            color: var(--color-success);
        }

        .status-badge.warning {
            background: rgba(238, 175, 0, 0.15);
            color: var(--color-warning);
        }

        .status-badge.critical {
            background: rgba(255, 84, 124, 0.15);
            color: var(--color-error);
        }

        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }

        .status-dot.healthy { background: var(--color-success); }
        .status-dot.warning { background: var(--color-warning); }
        .status-dot.critical { background: var(--color-error); }

        /* Usage Summary */
        .usage-summary {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }

        .amount-display {
            font-size: 36px;
            font-weight: 700;
            color: var(--vscode-fg);
        }

        .amount-display.warning { color: var(--color-warning); }
        .amount-display.critical { color: var(--color-error); }

        .progress-container {
            flex: 1;
            min-width: 200px;
        }

        .progress-bar-bg {
            background: var(--vscode-input-bg);
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
        }

        .progress-bar-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
        }

        .progress-bar-fill.healthy { background: var(--color-success); }
        .progress-bar-fill.warning { background: var(--color-warning); }
        .progress-bar-fill.critical { background: var(--color-error); }

        .progress-text {
            text-align: center;
            font-size: 12px;
            margin-top: 6px;
            color: var(--vscode-desc-fg);
        }

        /* Info Grid */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .info-item {
            padding: 12px;
            background: var(--vscode-input-bg);
            border-radius: 4px;
        }

        .info-label {
            font-size: 10px;
            color: var(--vscode-desc-fg);
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-value {
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-fg);
        }

        /* Metric Row */
        .metric-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .metric-row:last-child {
            border-bottom: none;
        }

        .metric-label {
            color: var(--vscode-desc-fg);
            font-size: 14px;
        }

        .metric-value {
            font-weight: 600;
            font-size: 14px;
            color: var(--vscode-fg);
        }

        /* Buttons */
        .button-container {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-family: var(--font-body);
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s ease;
            flex: 1;
            min-width: 120px;
            justify-content: center;
        }

        .btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .btn-primary {
            background: var(--vscode-button-bg);
            color: var(--vscode-button-fg);
        }

        .btn-secondary {
            background: var(--vscode-button-secondary-bg);
            color: var(--vscode-button-secondary-fg);
        }

        .btn-success {
            background: var(--color-success);
            color: #002244;
        }

        body.vscode-dark .btn-success {
            background: var(--color-success);
            color: #0d1b2a;
        }

        .btn-warning {
            background: var(--color-warning);
            color: #002244;
        }

        body.vscode-dark .btn-warning {
            background: var(--color-warning);
            color: #0d1b2a;
        }

        .btn-toggle {
            padding: 6px 12px;
            font-size: 12px;
            min-width: auto;
            flex: none;
        }

        /* Model Selector */
        .model-section {
            position: relative;
            margin-bottom: 24px;
        }

        .model-current {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--vscode-input-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            cursor: pointer;
            transition: border-color 0.2s ease;
        }

        .model-current:hover {
            border-color: var(--vscode-focus-border);
        }

        .model-current-label {
            font-size: 11px;
            color: var(--vscode-desc-fg);
            margin-bottom: 2px;
        }

        .model-current-value {
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-fg);
        }

        .model-current-arrow {
            font-size: 12px;
            color: var(--vscode-desc-fg);
            transition: transform 0.2s ease;
        }

        .model-current.open .model-current-arrow {
            transform: rotate(180deg);
        }

        .model-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 8px;
            background: var(--vscode-dropdown-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
        }

        .model-dropdown.open {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .model-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            cursor: pointer;
            transition: background-color 0.15s ease;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .model-item:last-child {
            border-bottom: none;
        }

        .model-item:hover {
            background: var(--vscode-list-hover);
        }

        .model-item.selected {
            background: var(--vscode-list-active);
        }

        .model-item-name {
            font-size: 14px;
            font-weight: 500;
        }

        .model-item-badge {
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 4px;
            background: var(--color-success);
            color: var(--color-success-text);
            font-weight: 600;
        }

        .model-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            gap: 8px;
            color: var(--vscode-desc-fg);
        }

        .model-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-panel-border);
            border-top-color: var(--vscode-fg);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Confirmation Dialog */
        .model-confirm-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 200;
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
        }

        .model-confirm-overlay.open {
            opacity: 1;
            visibility: visible;
        }

        .model-confirm-dialog {
            background: var(--vscode-panel-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            transform: scale(0.95);
            transition: transform 0.2s ease;
        }

        .model-confirm-overlay.open .model-confirm-dialog {
            transform: scale(1);
        }

        .model-confirm-title {
            font-family: var(--font-heading);
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 12px;
            color: var(--vscode-fg);
        }

        .model-confirm-text {
            font-size: 14px;
            color: var(--vscode-desc-fg);
            margin-bottom: 20px;
            line-height: 1.5;
        }

        .model-confirm-buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        /* Footer */
        .footer-text {
            text-align: center;
            font-size: 12px;
            color: var(--vscode-desc-fg);
        }

        /* Responsive */
        @media (max-width: 640px) {
            body { padding: 16px; }
            .card { padding: 16px; }
            .info-grid { grid-template-columns: 1fr; }
            .usage-summary { flex-direction: column; align-items: flex-start; }
            .button-container { flex-direction: column; }
            .btn { width: 100%; }
        }
    </style>

</head>
<body>
    <div class="container">
        <header class="header">
            <h1>📊 Elysia-Code Management Panel</h1>
            <p class="header-subtitle">Monitor your Elysia API usage and configuration</p>
        </header>

        <!-- Model Selector -->
        <div class="card model-section">
            <div class="section-title">🤖 AI Model</div>
            <div class="model-current" id="modelCurrent" onclick="toggleModelDropdown()">
                <div>
                    <div class="model-current-label">Current Model</div>
                    <div class="model-current-value" id="currentModelName">${config.model}</div>
                </div>
                <div class="model-current-arrow">▼</div>
            </div>

            <div class="model-dropdown" id="modelDropdown">
                <div class="model-loading" id="modelLoading">
                    <div class="model-spinner"></div>
                    <span>Loading models...</span>
                </div>
                <div id="modelList" style="display: none;"></div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="card">
            <div class="section-title">⚡ Actions</div>
            <div class="button-container">
                <button class="btn btn-secondary" onclick="refreshData()">
                    <span>🔄</span> Refresh
                </button>
                <button class="btn btn-success" onclick="restartCompression()">
                    <span>🚀</span> Restart
                </button>
                <button class="btn btn-secondary" onclick="openSettings()">
                    <span>⚙️</span> Settings
                </button>
            </div>
        </div>

        <!-- Usage Summary -->
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div class="section-title" style="margin-bottom: 0;">📈 Usage Summary</div>
                <span class="status-badge ${statusClass}">
                    <span class="status-dot ${statusClass}"></span>
                    ${statusText}
                </span>
            </div>

            <div class="usage-summary">
                <div class="amount-display ${statusClass}">$${config.usedAmount.toFixed(2)}</div>
                <div class="progress-container">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill ${statusClass}" style="width: ${progressWidth}%;"></div>
                    </div>
                    <div class="progress-text">${percentage.toFixed(1)}% of $${config.totalAmount.toFixed(2)}</div>
                </div>
            </div>
        </div>

        <!-- Configuration -->
        <div class="card">
            <div class="section-title">⚙️ Configuration</div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Version</div>
                    <div class="info-value">${config.version}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Workspace</div>
                    <div class="info-value">${config.workspace}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Config ID</div>
                    <div class="info-value">${config.configId}</div>
                </div>
                <div class="info-item" id="compressionStatusItem">
                    <div class="info-label">Compression</div>
                    <div class="info-value" id="compressionValue">Loading...</div>
                </div>
            </div>

            <div style="margin-top: 16px;">
                <div class="metric-row">
                    <span class="metric-label">Private Mode</span>
                    <button class="btn ${config.isPrivate ? 'btn-warning' : 'btn-success'} btn-toggle" onclick="togglePrivateMode()">
                        ${config.isPrivate ? '🔒 Private' : '🔓 Standard'}
                    </button>
                </div>
                <div class="metric-row">
                    <span class="metric-label">LangSmith</span>
                    <span class="metric-value" style="color: var(--color-success);">
                        ${config.langSmithEnabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Status</span>
                    <span class="metric-value">${config.status}</span>
                </div>
            </div>
        </div>

        <div class="card footer-text">
            Last updated: ${new Date().toLocaleString()}<br>
            Auto-refreshes every 5 minutes
        </div>

        <!-- Confirmation Dialog -->
        <div class="model-confirm-overlay" id="confirmOverlay">
            <div class="model-confirm-dialog">
                <div class="model-confirm-title">🔄 Change Model?</div>
                <div class="model-confirm-text">
                    You're about to switch from <strong id="oldModelDisplay"></strong> to <strong id="newModelDisplay"></strong>.
                    <br><br>
                    This will restart the Elysia compression service and reload VS Code.
                </div>
                <div class="model-confirm-buttons">
                    <button class="btn" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="closeConfirmDialog()">
                        Cancel
                    </button>
                    <button class="btn btn-success" onclick="confirmModelChange()">
                        🚀 Change & Restart
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();

            // State
            let availableModels = [];
            let selectedModel = null;
            let currentModel = '${config.model}';

            // ========== Existing Functions ==========
            window.refreshData = function() {
                console.log('Refresh button clicked');
                vscode.postMessage({ command: 'refresh' });
            };

            window.openSettings = function() {
                console.log('Settings button clicked');
                vscode.postMessage({ command: 'openSettings' });
            };

            window.restartCompression = function() {
                console.log('Restart compression button clicked');
                vscode.postMessage({ command: 'restartCompression' });
            };

            window.togglePrivateMode = function() {
                console.log('Toggle private mode button clicked');
                vscode.postMessage({ command: 'togglePrivateMode' });
            };

            // ========== Model Selector Functions ==========

            // Toggle dropdown visibility
            window.toggleModelDropdown = function() {
                const dropdown = document.getElementById('modelDropdown');
                const current = document.getElementById('modelCurrent');

                if (!dropdown.classList.contains('open')) {
                    // Open dropdown and load models
                    dropdown.classList.add('open');
                    current.classList.add('open');
                    loadModels();
                } else {
                    // Close dropdown
                    closeModelDropdown();
                }
            };

            // Close dropdown
            window.closeModelDropdown = function() {
                const dropdown = document.getElementById('modelDropdown');
                const current = document.getElementById('modelCurrent');
                dropdown.classList.remove('open');
                current.classList.remove('open');
            };

            // Load models from extension
            function loadModels() {
                console.log('Loading models...');
                vscode.postMessage({ command: 'loadModels' });
            }

            // Display models in dropdown (called from extension response)
            window.displayModels = function(models, activeModel) {
                const loading = document.getElementById('modelLoading');
                const list = document.getElementById('modelList');

                availableModels = models;
                currentModel = activeModel;

                // Update current model display
                document.getElementById('currentModelName').textContent = currentModel;

                if (models.length === 0) {
                    list.innerHTML = '<div class="model-error">Failed to load models</div>';
                } else {
                    list.innerHTML = models.map(function(model) {
                        const isActive = model === activeModel;
                        return '<div class="model-item ' + (isActive ? 'selected' : '') + '" onclick="selectModel(\\'' + model + '\\')">' +
                            '<span class="model-item-name">' + model + '</span>' +
                            (isActive ? '<span class="model-item-badge">active</span>' : '') +
                            '</div>';
                    }).join('');
                }

                loading.style.display = 'none';
                list.style.display = 'block';
            };

            // Select a model
            window.selectModel = function(modelName) {
                if (modelName === currentModel) {
                    // Already selected, just close
                    closeModelDropdown();
                    return;
                }

                selectedModel = modelName;
                closeModelDropdown();

                // Show confirmation dialog
                document.getElementById('oldModelDisplay').textContent = currentModel;
                document.getElementById('newModelDisplay').textContent = selectedModel;
                document.getElementById('confirmOverlay').classList.add('open');
            };

            // Close confirmation dialog
            window.closeConfirmDialog = function() {
                document.getElementById('confirmOverlay').classList.remove('open');
                selectedModel = null;
            };

            // Confirm model change
            window.confirmModelChange = function() {
                if (!selectedModel) return;

                document.getElementById('confirmOverlay').classList.remove('open');

                // Send message to extension to change model
                vscode.postMessage({
                    command: 'changeModel',
                    model: selectedModel
                });
            };

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                const section = document.querySelector('.model-section');
                if (section && !section.contains(e.target)) {
                    closeModelDropdown();
                }
            });

            // Listen for messages FROM extension
            window.addEventListener('message', function(event) {
                const message = event.data;
                switch (message.type) {
                    case 'modelsLoaded':
                        window.displayModels(message.models, message.activeModel);
                        break;
                    case 'modelChanged':
                        // Refresh the panel to show updated model
                        vscode.postMessage({ command: 'refresh' });
                        break;
                    case 'modelChangeError':
                        alert('Failed to change model: ' + message.error);
                        break;
                    case 'compressionStatusLoaded':
                        // Update compression status in Configuration panel
                        const compressionValue = document.getElementById('compressionValue');
                        if (compressionValue) {
                            compressionValue.textContent = message.enabled ? 'Enabled' : 'Disabled';
                            compressionValue.style.color = message.enabled ? '#4ec9b0' : '#f14c4c';
                        }
                        break;
                }
            });

            // Load compression status on page load
            setTimeout(function() {
                vscode.postMessage({ command: 'loadCompressionStatus' });
            }, 500);
        })();
    </script>
</body>
</html>`;
  }

  dispose(): void {
    DetailsPanel.currentPanel = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
