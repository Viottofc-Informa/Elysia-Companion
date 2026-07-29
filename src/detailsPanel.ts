import * as vscode from 'vscode';
import { ElysiaConfig } from './elysiaService';

export class DetailsPanel {
  private static currentPanel: DetailsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(config: ElysiaConfig, extensionUri: vscode.Uri) {
    this.panel = vscode.window.createWebviewPanel(
      'elysiaUsageDetails',
      'Elysia Usage Details',
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

  public static show(config: ElysiaConfig, extensionUri: vscode.Uri): void {
    if (DetailsPanel.currentPanel) {
      DetailsPanel.currentPanel.update(config);
      DetailsPanel.currentPanel.panel.reveal();
    } else {
      DetailsPanel.currentPanel = new DetailsPanel(config, extensionUri);
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
    <title>Elysia Usage Details</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .card {
            background-color: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .metric-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .metric-row:last-child {
            border-bottom: none;
        }
        .metric-label {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        .metric-value {
            font-weight: 600;
            font-size: 14px;
        }
        .progress-container {
            margin: 20px 0;
        }
        .progress-bar-bg {
            background-color: var(--vscode-input-background);
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
            position: relative;
        }
        .progress-bar-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
            background: linear-gradient(90deg, ${progressColor}, ${progressColor}dd);
        }
        .progress-text {
            text-align: center;
            margin-top: 10px;
            font-size: 24px;
            font-weight: bold;
            color: ${progressColor};
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-healthy {
            background-color: #4ec9b020;
            color: #4ec9b0;
            border: 1px solid #4ec9b0;
        }
        .status-warning {
            background-color: #ffcc0020;
            color: #ffcc00;
            border: 1px solid #ffcc00;
        }
        .status-critical {
            background-color: #f14c4c20;
            color: #f14c4c;
            border: 1px solid #f14c4c;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--vscode-titleBar-activeForeground);
        }
        .amount-display {
            text-align: center;
            padding: 20px;
        }
        .amount-used {
            font-size: 36px;
            font-weight: bold;
            color: ${percentage >= 75 ? progressColor : 'var(--vscode-foreground)'};
        }
        .amount-total {
            font-size: 18px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        .divider {
            border: none;
            border-top: 1px solid var(--vscode-panel-border);
            margin: 20px 0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .info-item {
            padding: 10px;
            background-color: var(--vscode-input-background);
            border-radius: 4px;
        }
        .info-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }
        .info-value {
            font-size: 14px;
            font-weight: 500;
        }

        /* Buttons */
        .button-container {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            justify-content: center;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn:hover {
            opacity: 0.8;
            transform: translateY(-1px);
        }
        .btn:active {
            transform: translateY(0);
        }
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-success {
            background-color: #4ec9b0;
            color: #000;
        }
        .btn-warning {
            background-color: #ffcc00;
            color: #000;
        }
        .btn-danger {
            background-color: #f14c4c;
            color: #fff;
        }

        /* Model Selector Styles */
        .model-section {
            position: relative;
        }
        .model-current {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .model-current:hover {
            border-color: var(--vscode-focusBorder);
        }
        .model-current-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 2px;
        }
        .model-current-value {
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        .model-current-arrow {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
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
            background-color: var(--vscode-dropdown-background);
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
            background-color: var(--vscode-list-hoverBackground);
        }
        .model-item.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
        }
        .model-item-name {
            font-size: 14px;
            font-weight: 500;
        }
        .model-item-badge {
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 4px;
            background-color: #4ec9b0;
            color: #000;
            font-weight: 600;
        }
        .model-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            gap: 8px;
            color: var(--vscode-descriptionForeground);
        }
        .model-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-panel-border);
            border-top-color: var(--vscode-foreground);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .model-error {
            padding: 16px;
            color: #f14c4c;
            text-align: center;
            font-size: 13px;
        }

        /* Confirmation Overlay */
        .model-confirm-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
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
            background-color: var(--vscode-panel-background);
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
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
        }
        .model-confirm-text {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .model-confirm-buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
    </style>

</head>
<body>
    <div class="container">
        <h1>📊 Elysia Usage Dashboard</h1>

        <div class="card">
            <div class="section-title">
                Usage Summary
                <span class="status-badge status-${statusClass}" style="float: right;">${statusText}</span>
            </div>

            <div class="amount-display">
                <div class="amount-used">$${config.usedAmount.toFixed(2)}</div>
                <div class="amount-total">of $${config.totalAmount.toFixed(2)} total</div>
            </div>

            <div class="progress-container">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${progressWidth}%;"></div>
                </div>
                <div class="progress-text">${percentage.toFixed(1)}%</div>
            </div>

            <div class="metric-row">
                <span class="metric-label">Remaining</span>
                <span class="metric-value">$${(config.totalAmount - config.usedAmount).toFixed(2)}</span>
            </div>

            <div class="metric-row">
                <span class="metric-label">Cost Status</span>
                <span class="metric-value">${config.status}</span>
            </div>
        </div>

        <div class="card">
            <div class="section-title">Configuration</div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Version</div>
                    <div class="info-value">${config.version}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Model</div>
                    <div class="info-value">${config.model}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Workspace</div>
                    <div class="info-value">${config.workspace}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Config ID</div>
                    <div class="info-value">${config.configId}</div>
                </div>
            </div>

            <hr class="divider">

            <div class="metric-row">
                <span class="metric-label">Private</span>
                <span class="metric-value">${config.isPrivate ? 'Yes' : 'No'}</span>
            </div>

            <div class="metric-row">
                <span class="metric-label">LangSmith</span>
                <span class="metric-value">${config.langSmithEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
        </div>

        <div class="card" style="text-align: center; color: var(--vscode-descriptionForeground);">
            <small>Last updated: ${new Date().toLocaleString()}</small><br>
            <small>Auto-refreshes every 5 minutes</small>
        </div>

        <!-- Model Selector -->
        <div class="card model-section" style="margin-top: 20px; padding: 20px;">
            <div class="section-title" style="margin-bottom: 15px;">🤖 AI Model</div>

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
                    <button class="btn" style="background-color: #4ec9b0; color: #000;" onclick="confirmModelChange()">
                        🚀 Change & Restart
                    </button>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="card" style="margin-top: 20px; padding: 20px;">
            <div class="section-title" style="margin-bottom: 15px;">⚡ Actions</div>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button class="btn" style="background-color: var(--vscode-button-background); color: var(--vscode-button-foreground);" onclick="refreshData()">
                    <span>🔄</span> Refresh Data
                </button>
                <button class="btn" style="background-color: #4ec9b0; color: #000;" onclick="restartCompression()">
                    <span>🚀</span> Restart
                </button>
                <button class="btn" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="openSettings()">
                    <span>⚙️</span> Settings
                </button>
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
                }
            });
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
