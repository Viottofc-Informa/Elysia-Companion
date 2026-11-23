import * as vscode from 'vscode';
import { ElysiaConfig, CompressionStats, RecentRequest } from './elysiaService';

import { ElysiaService } from './elysiaService';
import { SettingsService, PluginState } from './settingsService';
import { buildCatalogView } from './modelCatalog';

type TabName = 'usage' | 'compression' | 'plugins';

export class DetailsPanel {
  private static currentPanel: DetailsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private elysiaService: ElysiaService | undefined;
  private settingsService: SettingsService = new SettingsService();

  private constructor(config: ElysiaConfig, extensionUri: vscode.Uri, elysiaService?: ElysiaService, initialTab?: TabName) {
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

    // Store extension URI and initial tab for commands
    this.panel.webview.postMessage({
      type: 'init',
      extensionUri: extensionUri.toString(),
      initialTab: initialTab || 'usage'
    });

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
          case 'loadCompressionStats':
            // Get detailed compression stats and send back to webview
            try {
              if (this.elysiaService) {
                const compressionStats = await this.elysiaService.fetchCompressionStats();
                this.panel.webview.postMessage({
                  type: 'compressionStatsLoaded',
                  stats: compressionStats
                });
              }
            } catch (err) {
              this.panel.webview.postMessage({
                type: 'compressionStatsLoaded',
                stats: null
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
          case 'loadPlugins':
            this.postPluginStates();
            break;
          case 'setPluginMode':
            try {
              this.settingsService.setPluginMode(message.plugin, message.mode);
              this.panel.webview.postMessage({
                type: 'pluginModeSet',
                success: true,
                restartRequired: true,
                error: null
              });
              this.postPluginStates(); // re-sync UI with on-disk state
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              console.log(`[DetailsPanel] Error setting plugin mode: ${errorMsg}`);
              this.panel.webview.postMessage({
                type: 'pluginModeSet',
                success: false,
                restartRequired: false,
                error: errorMsg
              });
            }
            break;
        }
      },
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static show(config: ElysiaConfig, extensionUri: vscode.Uri, elysiaService?: ElysiaService, initialTab?: TabName): void {
    if (DetailsPanel.currentPanel) {
      DetailsPanel.currentPanel.update(config);
      DetailsPanel.currentPanel.panel.reveal();
      // Switch to specified tab if different from current
      if (initialTab) {
        DetailsPanel.currentPanel.panel.webview.postMessage({
          type: 'switchTab',
          tab: initialTab
        });
      }
    } else {
      DetailsPanel.currentPanel = new DetailsPanel(config, extensionUri, elysiaService, initialTab);
    }
  }

  public update(config: ElysiaConfig): void {
    this.panel.webview.html = this.getWebviewContent(config);
  }

  // Push current plugin states to the webview (null => settings.json unavailable)
  private postPluginStates(): void {
    const plugins = this.settingsService.getPluginStates();
    this.panel.webview.postMessage({ type: 'pluginsLoaded', plugins });
  }

  // Update compression stats in the webview
  public updateCompressionStats(stats: CompressionStats | null): void {
    if (stats) {
      this.panel.webview.postMessage({
        type: 'compressionStatsLoaded',
        stats: stats
      });
    }
  }

  private getWebviewContent(config: ElysiaConfig): string {
    const percentage = config.percentage;
    const progressWidth = Math.min(percentage, 100);

    // Determine color based on usage
    let progressColor = '#4ec9b0';
    let statusText = 'Healthy';
    let statusClass = 'healthy';

    if (config.isResetState) {
      // Month just reset: show a neutral "Reset" state
      progressColor = '#6c8ebf';
      statusText = 'Month Reset';
      statusClass = 'healthy'; // blue-ish but reuse healthy for clean badge
    } else if (percentage >= 90) {
      progressColor = '#f14c4c';
      statusText = 'Critical';
      statusClass = 'critical';
    } else if (percentage >= 75) {
      progressColor = '#ffcc00';
      statusText = 'Warning';
      statusClass = 'warning';
    }

    // Per-model metadata, pre-rendered for the webview. Serialised into the HTML
    // because the model rows are built in client-side JS, which cannot call the
    // TypeScript formatters. Text is embedded as JSON, so escape `</` to keep it
    // from terminating the surrounding <script> block early.
    const catalogJson = JSON.stringify(buildCatalogView()).replace(/<\//g, '<\\/');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elysia Companion</title>
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
            /* Two-line rows need more room than the previous single-line list:
               ~62px per model, so this shows roughly 8 of 13 before scrolling. */
            max-height: min(60vh, 520px);
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
            flex-direction: column;
            align-items: stretch;
            gap: 3px;
            padding: 10px 16px;
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

        /* Row line 1: model name on the left, badge and ⓘ on the right. */
        .model-item-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .model-item-name {
            font-size: 14px;
            font-weight: 500;
        }

        /* Row line 2: context + pricing. tabular-nums keeps the prices in a
           vertical column across rows, which is what makes the list scannable. */
        .model-item-meta {
            font-size: 11px;
            color: var(--vscode-desc-fg);
            font-variant-numeric: tabular-nums;
        }

        .model-item-badge {
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 4px;
            background: var(--color-success);
            color: var(--color-success-text);
            font-weight: 600;
            margin-left: auto;
        }

        .model-info-btn {
            background: none;
            border: none;
            color: var(--vscode-desc-fg);
            cursor: help;
            font-size: 13px;
            line-height: 1;
            padding: 2px 6px;
            border-radius: 3px;
        }

        .model-info-btn:hover,
        .model-info-btn:focus-visible {
            color: var(--vscode-fg);
            outline: 1px solid var(--vscode-focus-border, var(--vscode-desc-fg));
        }

        /* Tooltip is position:fixed and lives on <body>, not inside the dropdown:
           .model-dropdown has overflow-y:auto and would clip it at every edge.
           Position is computed in JS from the ⓘ anchor, flipping above when there
           is not enough room below. */
        .model-tooltip {
            position: fixed;
            z-index: 1000;
            /* Never wider than the panel: a VS Code sidebar can be ~300px, and a
               fixed 320px tooltip would be clipped with no way to scroll to it. */
            max-width: min(320px, calc(100vw - 16px));
            padding: 12px 14px;
            background: var(--vscode-panel-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
            font-size: 12px;
            color: var(--vscode-fg);
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.12s ease;
        }

        .model-tooltip.open {
            opacity: 1;
            visibility: visible;
        }

        .model-tooltip-title {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 6px;
        }

        .model-tooltip-desc {
            color: var(--vscode-desc-fg);
            line-height: 1.45;
            margin-bottom: 10px;
        }

        .model-tooltip-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 2px 0;
            font-variant-numeric: tabular-nums;
        }

        .model-tooltip-row span:first-child {
            color: var(--vscode-desc-fg);
        }

        /* Provenance line — the metadata is curated and dated, not live gateway
           output, and should not read as more authoritative than it is.
           Sticky so it stays visible: with 13 rows in a scrollable dropdown it
           would otherwise sit below the fold and never be read. */
        .model-footer {
            position: sticky;
            bottom: 0;
            padding: 8px 16px;
            font-size: 10px;
            color: var(--vscode-desc-fg);
            background: var(--vscode-dropdown-bg);
            border-top: 1px solid var(--vscode-panel-border);
            text-align: center;
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

        /* Tabs */
        .tabs-container {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 0;
        }

        .tab {
            padding: 10px 20px;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            font-family: var(--font-body);
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-desc-fg);
            transition: all 0.2s ease;
        }

        .tab:hover {
            color: var(--vscode-fg);
        }

        .tab.active {
            color: var(--color-primary);
            border-bottom-color: var(--color-primary);
        }

        /* Tab Content */
        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        /* Compression Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        }

        .stat-card {
            background: var(--vscode-input-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .stat-card-icon {
            font-size: 18px;
        }

        .stat-card-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-desc-fg);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stat-card-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--vscode-fg);
            margin-bottom: 4px;
        }

        .stat-card-subtitle {
            font-size: 12px;
            color: var(--vscode-desc-fg);
        }

        .stat-card-value.success { color: var(--color-success); }
        .stat-card-value.warning { color: var(--color-warning); }

        /* Collapsible Section */
        .collapsible {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin-bottom: 12px;
            overflow: hidden;
        }

        .collapsible-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--vscode-input-bg);
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .collapsible-header:hover {
            background: var(--vscode-list-hover);
        }

        .collapsible-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-fg);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .collapsible-arrow {
            font-size: 12px;
            color: var(--vscode-desc-fg);
            transition: transform 0.2s ease;
        }

        .collapsible.open .collapsible-arrow {
            transform: rotate(180deg);
        }

        .collapsible-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }

        .collapsible.open .collapsible-content {
            max-height: 2000px;
        }

        .collapsible-inner {
            padding: 16px;
            background: var(--vscode-panel-bg);
        }

        /* Table Styles */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }

        .data-table th,
        .data-table td {
            padding: 10px 8px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .data-table th {
            font-weight: 600;
            color: var(--vscode-desc-fg);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .data-table tr:last-child td {
            border-bottom: none;
        }

        .data-table tr:hover td {
            background: var(--vscode-list-hover);
        }

        .data-table .truncate {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Request Detail Card */
        .request-card {
            background: var(--vscode-input-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 8px;
        }

        .request-card:last-child {
            margin-bottom: 0;
        }

        .request-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .request-card-id {
            font-family: monospace;
            font-size: 12px;
            color: var(--vscode-desc-fg);
        }

        .request-card-time {
            font-size: 11px;
            color: var(--vscode-desc-fg);
        }

        .request-card-body {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px;
        }

        .request-card-metric {
            text-align: center;
            padding: 8px;
            background: var(--vscode-panel-bg);
            border-radius: 4px;
        }

        .request-card-metric-value {
            font-size: 14px;
            font-weight: 700;
            color: var(--vscode-fg);
        }

        .request-card-metric-value.saved {
            color: var(--color-success);
        }

        .request-card-metric-label {
            font-size: 10px;
            color: var(--vscode-desc-fg);
            margin-top: 2px;
        }

        .request-card-transforms {
            margin-top: 8px;
            font-size: 11px;
            color: var(--vscode-desc-fg);
        }

        .transform-tag {
            display: inline-block;
            padding: 2px 6px;
            background: var(--vscode-list-hover);
            border-radius: 3px;
            margin-right: 4px;
            margin-bottom: 2px;
        }

        /* Loading State */
        .loading-container {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            gap: 12px;
            color: var(--vscode-desc-fg);
        }

        /* Plugins Tab */
        .plugin-card {
            background: var(--vscode-panel-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 12px;
        }

        .plugin-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
        }

        .plugin-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--vscode-fg);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .plugin-version {
            font-size: 11px;
            font-weight: 400;
            color: var(--vscode-desc-fg);
        }

        .plugin-desc {
            font-size: 12px;
            color: var(--vscode-desc-fg);
            margin-bottom: 12px;
        }

        .plugin-controls {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .plugin-mode-label {
            font-size: 11px;
            color: var(--vscode-desc-fg);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .plugin-select {
            background: var(--vscode-dropdown-bg);
            color: var(--vscode-fg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 6px 10px;
            font-family: var(--font-body);
            font-size: 13px;
            cursor: pointer;
        }

        .plugin-select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Toggle switch */
        .toggle {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 22px;
            flex: none;
        }

        .toggle input { opacity: 0; width: 0; height: 0; }

        .toggle-slider {
            position: absolute;
            inset: 0;
            cursor: pointer;
            background: var(--vscode-input-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 22px;
            transition: background 0.2s ease;
        }

        .toggle-slider:before {
            content: "";
            position: absolute;
            height: 16px;
            width: 16px;
            left: 2px;
            top: 2px;
            background: var(--vscode-desc-fg);
            border-radius: 50%;
            transition: transform 0.2s ease, background 0.2s ease;
        }

        .toggle input:checked + .toggle-slider {
            background: var(--color-success-bg);
            border-color: var(--color-success);
        }

        .toggle input:checked + .toggle-slider:before {
            transform: translateX(18px);
            background: var(--color-success);
        }

        .readonly-badge {
            font-size: 10px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 10px;
            background: var(--vscode-list-hover);
            color: var(--vscode-desc-fg);
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .restart-banner {
            display: none;
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 6px;
            background: var(--color-warning-bg);
            color: var(--color-warning-text);
            border: 1px solid var(--color-warning);
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
        }

        .restart-banner.visible {
            display: flex;
        }

        .restart-banner .btn-toggle {
            width: 100%;
            justify-content: center;
        }

        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--vscode-panel-border);
            border-top-color: var(--vscode-fg);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        /* Responsive */
        @media (max-width: 640px) {
            body { padding: 16px; }
            .card { padding: 16px; }
            .info-grid { grid-template-columns: 1fr; }
            .usage-summary { flex-direction: column; align-items: flex-start; }
            .button-container { flex-direction: column; }
            .btn { width: 100%; }
            .stats-grid { grid-template-columns: 1fr; }
            .tabs-container { overflow-x: auto; }
            .tab { white-space: nowrap; padding: 8px 12px; font-size: 12px; }
        }
    </style>

</head>
<body>
    <div class="container">
        <header class="header">
            <h1>📊 Elysia Companion</h1>
            <p class="header-subtitle">Monitor your Elysia API usage, compression, and configuration</p>
        </header>

        <!-- Tabs Navigation -->
        <div class="tabs-container">
            <button class="tab active" onclick="switchTab('usage')" data-tab="usage">Usage</button>
            <button class="tab" onclick="switchTab('compression')" data-tab="compression">Compression</button>
            <button class="tab" onclick="switchTab('plugins')" data-tab="plugins">Plugins</button>
        </div>

        <!-- Usage Tab -->
        <div id="tab-usage" class="tab-content active">

            <!-- Model Selector (top of Usage tab) -->
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
                    <div class="model-footer" id="modelFooter" style="display: none;">
                        Details from pilots.ai.informa.com/elysia-code/ · verified 2026-11-23
                    </div>
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
                    <div class="amount-display ${statusClass}">${config.isResetState ? '↺ Month Reset' : `$${config.usedAmount.toFixed(2)}`}</div>
                    <div class="progress-container">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill ${statusClass}" style="width: ${progressWidth}%;"></div>
                        </div>
                        <div class="progress-text">${config.isResetState ? 'No usage yet this month' : `${percentage.toFixed(1)}% of $${config.totalAmount.toFixed(2)}`}</div>
                    </div>
                </div>
            </div>

            <!-- Model Information (v0.3.10+) -->
            ${config.context || config.autoCompact || config.inputPrice || config.outputPrice ? `
            <div class="card">
                <div class="section-title">🤖 Model Information</div>
                <div class="info-grid">
                    ${config.context ? `
                    <div class="info-item">
                        <div class="info-label">Context Window</div>
                        <div class="info-value">${config.context}</div>
                    </div>
                    ` : ''}
                    ${config.autoCompact ? `
                    <div class="info-item">
                        <div class="info-label">Auto-Compact</div>
                        <div class="info-value">${config.autoCompact}</div>
                    </div>
                    ` : ''}
                    ${config.inputPrice ? `
                    <div class="info-item">
                        <div class="info-label">Input / 1M tokens</div>
                        <div class="info-value">${config.inputPrice}</div>
                    </div>
                    ` : ''}
                    ${config.outputPrice ? `
                    <div class="info-item">
                        <div class="info-label">Output / 1M tokens</div>
                        <div class="info-value">${config.outputPrice}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

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
                        <span class="metric-label">Status</span>
                        <span class="metric-value">${config.status}</span>
                    </div>
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
                    ${config.resets ? `
                    <div class="metric-row">
                        <span class="metric-label">Reset Frequency</span>
                        <span class="metric-value">${config.resets}</span>
                    </div>
                    ` : ''}
                    ${config.expires ? `
                    <div class="metric-row">
                        <span class="metric-label">Quota Expires</span>
                        <span class="metric-value">${config.expires}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Compression Log (v0.3.10+) -->
            ${config.compressionLog ? `
            <div class="card">
                <div class="section-title">📄 Compression Log</div>
                <div style="background: var(--vscode-input-bg); padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; color: var(--vscode-desc-fg);">
                    ${config.compressionLog}
                </div>
            </div>
            ` : ''}

            <!-- Action Buttons (at bottom of Usage tab) -->
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

            <div class="card footer-text">
                Last updated: ${new Date().toLocaleString()}<br>
                Auto-refreshes every 5 minutes
            </div>
        </div>

        <!-- Compression Tab -->
        <div id="tab-compression" class="tab-content">
            <!-- Compression Stats Loading -->
            <div id="compression-loading" class="loading-container">
                <div class="loading-spinner"></div>
                <span>Loading compression stats...</span>
            </div>

            <!-- Compression Stats Content -->
            <div id="compression-content" style="display: none;">
                <!-- Status Card -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <span class="stat-card-icon">🚀</span>
                            <span class="stat-card-title">Status</span>
                        </div>
                        <div class="stat-card-value" id="comp-status-value">—</div>
                        <div class="stat-card-subtitle">Port <span id="comp-port">—</span></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <span class="stat-card-icon">🎯</span>
                            <span class="stat-card-title">Mode</span>
                        </div>
                        <div class="stat-card-value" id="comp-mode-value">—</div>
                        <div class="stat-card-subtitle">Compression strategy</div>
                    </div>
                </div>

                <!-- Session Savings -->
                <div class="card">
                    <div class="section-title">💰 Session Savings</div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-card-header">
                                <span class="stat-card-icon">🪙</span>
                                <span class="stat-card-title">Tokens Saved</span>
                            </div>
                            <div class="stat-card-value success" id="comp-session-tokens">—</div>
                            <div class="stat-card-subtitle" id="comp-session-tokens-pct">—</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-header">
                                <span class="stat-card-icon">💵</span>
                                <span class="stat-card-title">USD Saved</span>
                            </div>
                            <div class="stat-card-value success" id="comp-session-usd">—</div>
                            <div class="stat-card-subtitle" id="comp-session-cost">—</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-header">
                                <span class="stat-card-icon">📨</span>
                                <span class="stat-card-title">Requests</span>
                            </div>
                            <div class="stat-card-value" id="comp-session-requests">—</div>
                            <div class="stat-card-subtitle">This session</div>
                        </div>
                    </div>
                </div>

                <!-- Lifetime Savings -->
                <div class="card">
                    <div class="section-title">💎 Lifetime Savings</div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-card-header">
                                <span class="stat-card-icon">🪙</span>
                                <span class="stat-card-title">Total Tokens Saved</span>
                            </div>
                            <div class="stat-card-value success" id="comp-lifetime-tokens">—</div>
                            <div class="stat-card-subtitle">All time</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-header">
                                <span class="stat-card-icon">💵</span>
                                <span class="stat-card-title">Total USD Saved</span>
                            </div>
                            <div class="stat-card-value success" id="comp-lifetime-usd">—</div>
                            <div class="stat-card-subtitle" id="comp-lifetime-cost">—</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-header">
                                <span class="stat-card-icon">📊</span>
                                <span class="stat-card-title">Total Requests</span>
                            </div>
                            <div class="stat-card-value" id="comp-lifetime-requests">—</div>
                            <div class="stat-card-subtitle">All time</div>
                        </div>
                    </div>
                </div>

                <!-- Top Projects -->
                <div class="collapsible" id="collapsible-projects">
                    <div class="collapsible-header" onclick="toggleCollapsible('collapsible-projects')">
                        <div class="collapsible-title">📁 Top Projects</div>
                        <span class="collapsible-arrow">▼</span>
                    </div>
                    <div class="collapsible-content">
                        <div class="collapsible-inner" id="comp-projects-list">
                            <p style="color: var(--vscode-desc-fg); text-align: center;">No project data available</p>
                        </div>
                    </div>
                </div>

                <!-- Top Models -->
                <div class="collapsible" id="collapsible-models">
                    <div class="collapsible-header" onclick="toggleCollapsible('collapsible-models')">
                        <div class="collapsible-title">🤖 Top Models</div>
                        <span class="collapsible-arrow">▼</span>
                    </div>
                    <div class="collapsible-content">
                        <div class="collapsible-inner" id="comp-models-list">
                            <p style="color: var(--vscode-desc-fg); text-align: center;">No model data available</p>
                        </div>
                    </div>
                </div>

                <!-- Recent Requests -->
                <div class="collapsible open" id="collapsible-requests">
                    <div class="collapsible-header" onclick="toggleCollapsible('collapsible-requests')">
                        <div class="collapsible-title">🕐 Recent Requests (Last 5)</div>
                        <span class="collapsible-arrow">▼</span>
                    </div>
                    <div class="collapsible-content">
                        <div class="collapsible-inner" id="comp-recent-requests">
                            <p style="color: var(--vscode-desc-fg); text-align: center;">No recent requests</p>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="card">
                    <div class="section-title">⚡ Actions</div>
                    <div class="button-container">
                        <button class="btn btn-secondary" onclick="loadCompressionStats()">
                            <span>🔄</span> Refresh Stats
                        </button>
                        <button class="btn btn-success" onclick="restartCompression()">
                            <span>🚀</span> Restart
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Plugins Tab -->
        <div id="tab-plugins" class="tab-content">
            <div class="restart-banner" id="restartBanner">
                <span>⚠️ Saved. Restart the Elysia session (compression + Claude Code) for changes to take effect.</span>
                <button class="btn btn-success btn-toggle" onclick="restartEnvironment()">🚀 Restart</button>
            </div>
            <div id="plugins-loading" class="loading-container">
                <div class="loading-spinner"></div>
                <span>Loading plugins...</span>
            </div>
            <div id="plugins-content"></div>
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

            // Per-model metadata, pre-rendered by the extension (see modelCatalog.ts).
            // A model missing from this map still renders — just without line 2 or ⓘ.
            const MODEL_CATALOG = ${catalogJson};

            // State
            let availableModels = [];
            let selectedModel = null;
            let currentModel = '${config.model}';

            // ========== Tab Functions ==========
            window.switchTab = function(tabName) {
                // Update tab buttons
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelector('.tab[data-tab="' + tabName + '"]').classList.add('active');

                // Update tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById('tab-' + tabName).classList.add('active');

                // Load compression stats if switching to compression tab
                if (tabName === 'compression') {
                    loadCompressionStats();
                }

                // Load plugins if switching to plugins tab
                if (tabName === 'plugins') {
                    loadPlugins();
                }

                // Load model list when switching to usage tab
                if (tabName === 'usage') {
                    setTimeout(loadModels, 100);
                }
            };

            // Collapsible sections
            window.toggleCollapsible = function(id) {
                const collapsible = document.getElementById(id);
                collapsible.classList.toggle('open');
            };

            // ========== Compression Stats Functions ==========
            window.loadCompressionStats = function() {
                vscode.postMessage({ command: 'loadCompressionStats' });
            };

            window.displayCompressionStats = function(stats) {
                // Hide loading, show content
                document.getElementById('compression-loading').style.display = 'none';
                document.getElementById('compression-content').style.display = 'block';

                // Status card
                const statusValue = document.getElementById('comp-status-value');
                statusValue.textContent = stats.enabled ? '✅ Enabled' : '❌ Disabled';
                statusValue.className = 'stat-card-value ' + (stats.enabled ? 'success' : 'warning');
                document.getElementById('comp-port').textContent = stats.port;
                document.getElementById('comp-mode-value').textContent = stats.mode;

                // Session savings
                document.getElementById('comp-session-tokens').textContent = formatNumber(stats.session.tokensSaved);
                document.getElementById('comp-session-tokens-pct').textContent = stats.session.savingsPercent.toFixed(2) + '% savings';
                document.getElementById('comp-session-usd').textContent = '$' + stats.session.compressionSavingsUsd.toFixed(4);
                document.getElementById('comp-session-cost').textContent = '$' + stats.session.totalInputCostUsd.toFixed(2) + ' total cost';
                document.getElementById('comp-session-requests').textContent = formatNumber(stats.session.requests);

                // Lifetime savings
                document.getElementById('comp-lifetime-tokens').textContent = formatNumber(stats.lifetime.tokensSaved);
                document.getElementById('comp-lifetime-usd').textContent = '$' + stats.lifetime.compressionSavingsUsd.toFixed(2);
                document.getElementById('comp-lifetime-cost').textContent = '$' + stats.lifetime.totalInputCostUsd.toFixed(2) + ' total spent';
                document.getElementById('comp-lifetime-requests').textContent = formatNumber(stats.lifetime.requests);

                // Top Projects
                const projectsList = document.getElementById('comp-projects-list');
                const projectEntries = Object.entries(stats.projects || {});
                if (projectEntries.length > 0) {
                    // Sort by tokens saved
                    projectEntries.sort((a, b) => b[1].tokensSaved - a[1].tokensSaved);
                    projectsList.innerHTML = '<table class="data-table">' +
                        '<thead><tr>' +
                        '<th>Project</th>' +
                        '<th>Requests</th>' +
                        '<th>Tokens Saved</th>' +
                        '<th>Savings %</th>' +
                        '<th>USD Saved</th>' +
                        '</tr></thead>' +
                        '<tbody>' +
                        projectEntries.slice(0, 5).map(([name, p]) =>
                            '<tr>' +
                            '<td class="truncate" title="' + name + '">' + name + '</td>' +
                            '<td>' + formatNumber(p.requests) + '</td>' +
                            '<td>' + formatNumber(p.tokensSaved) + '</td>' +
                            '<td>' + p.savingsPercent.toFixed(2) + '%</td>' +
                            '<td>$' + p.compressionSavingsUsd.toFixed(2) + '</td>' +
                            '</tr>'
                        ).join('') +
                        '</tbody></table>';
                } else {
                    projectsList.innerHTML = '<p style="color: var(--vscode-desc-fg); text-align: center;">No project data available</p>';
                }

                // Top Models
                const modelsList = document.getElementById('comp-models-list');
                const modelEntries = Object.entries(stats.byModel || {});
                if (modelEntries.length > 0) {
                    // Sort by tokens saved
                    modelEntries.sort((a, b) => b[1].tokensSaved - a[1].tokensSaved);
                    modelsList.innerHTML = '<table class="data-table">' +
                        '<thead><tr>' +
                        '<th>Model</th>' +
                        '<th>Requests</th>' +
                        '<th>Tokens Saved</th>' +
                        '<th>Savings %</th>' +
                        '<th>USD Saved</th>' +
                        '</tr></thead>' +
                        '<tbody>' +
                        modelEntries.slice(0, 5).map(([name, m]) =>
                            '<tr>' +
                            '<td class="truncate" title="' + name + '">' + name + '</td>' +
                            '<td>' + formatNumber(m.requests) + '</td>' +
                            '<td>' + formatNumber(m.tokensSaved) + '</td>' +
                            '<td>' + m.savingsPercent.toFixed(2) + '%</td>' +
                            '<td>$' + m.compressionSavingsUsd.toFixed(2) + '</td>' +
                            '</tr>'
                        ).join('') +
                        '</tbody></table>';
                } else {
                    modelsList.innerHTML = '<p style="color: var(--vscode-desc-fg); text-align: center;">No model data available</p>';
                }

                // Recent Requests
                const requestsList = document.getElementById('comp-recent-requests');
                const requests = stats.recentRequests || [];
                if (requests.length > 0) {
                    requestsList.innerHTML = requests.map(req => {
                        const transforms = req.transformsApplied || [];
                        const transformsHtml = transforms.length > 0
                            ? '<div class="request-card-transforms">' + transforms.map(t => '<span class="transform-tag">' + t + '</span>').join('') + '</div>'
                            : '';
                        return '<div class="request-card">' +
                            '<div class="request-card-header">' +
                            '<span class="request-card-id">' + req.requestId + '</span>' +
                            '<span class="request-card-time">' + formatTime(req.timestamp) + '</span>' +
                            '</div>' +
                            '<div class="request-card-body">' +
                            '<div class="request-card-metric">' +
                            '<div class="request-card-metric-value">' + req.model + '</div>' +
                            '<div class="request-card-metric-label">Model</div>' +
                            '</div>' +
                            '<div class="request-card-metric">' +
                            '<div class="request-card-metric-value">' + formatNumber(req.inputTokensOriginal) + '</div>' +
                            '<div class="request-card-metric-label">Original</div>' +
                            '</div>' +
                            '<div class="request-card-metric">' +
                            '<div class="request-card-metric-value">' + formatNumber(req.inputTokensOptimized) + '</div>' +
                            '<div class="request-card-metric-label">Optimized</div>' +
                            '</div>' +
                            '<div class="request-card-metric">' +
                            '<div class="request-card-metric-value saved">' + formatNumber(req.tokensSaved) + '</div>' +
                            '<div class="request-card-metric-label">Saved (' + req.savingsPercent.toFixed(1) + '%)</div>' +
                            '</div>' +
                            '</div>' +
                            transformsHtml +
                            '</div>';
                    }).join('');
                } else {
                    requestsList.innerHTML = '<p style="color: var(--vscode-desc-fg); text-align: center;">No recent requests</p>';
                }
            };

            // Helper: Format large numbers
            function formatNumber(num) {
                if (num >= 1000000) {
                    return (num / 1000000).toFixed(1) + 'M';
                } else if (num >= 1000) {
                    return (num / 1000).toFixed(1) + 'K';
                }
                return num.toString();
            }

            // Helper: Format timestamp
            function formatTime(timestamp) {
                const date = new Date(timestamp);
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }

            // ========== Plugins Functions ==========
            const PLUGIN_META = {
                caveman:  { icon: '🪓', desc: 'Makes replies terse to reduce output tokens.' },
                ponytail: { icon: '🐴', desc: 'Pushes the model toward the smallest complete change.' },
                tracing:  { icon: '📡', desc: 'Sends request/tool traces to the internal LangSmith.' },
                shunt:    { icon: '🔀', desc: 'Routes bulk reads/writes to cheaper routed models.' }
            };

            window.loadPlugins = function() {
                vscode.postMessage({ command: 'loadPlugins' });
            };

            window.displayPlugins = function(plugins) {
                document.getElementById('plugins-loading').style.display = 'none';
                const container = document.getElementById('plugins-content');

                if (!plugins) {
                    container.innerHTML = '<div class="card"><p style="color: var(--vscode-desc-fg); text-align: center;">No elysia settings detected (~/.claude/settings.json not found).</p></div>';
                    return;
                }

                container.innerHTML = plugins.map(function(p) {
                    const meta = PLUGIN_META[p.id] || { icon: '🧩', desc: '' };
                    const version = p.version ? '<span class="plugin-version">v' + p.version + '</span>' : '';

                    if (!p.controllable) {
                        return '<div class="plugin-card">' +
                            '<div class="plugin-header"><span class="plugin-name">' + meta.icon + ' ' + p.name + ' ' + version + '</span>' +
                            '<span class="readonly-badge">Managed</span></div>' +
                            '<div class="plugin-desc">' + meta.desc + '</div>' +
                            '<div class="plugin-controls"><span class="plugin-mode-label">Status</span>' +
                            '<span class="metric-value" style="color:' + (p.mode === 'on' ? 'var(--color-success)' : 'var(--vscode-desc-fg)') + '">' +
                            (p.mode === 'on' ? '● On' : '○ Off') + '</span></div></div>';
                    }

                    const isOn = p.mode !== 'off';
                    const options = p.modes.map(function(m) {
                        return '<option value="' + m + '"' + (m === p.mode ? ' selected' : '') + '>' + m + '</option>';
                    }).join('');

                    return '<div class="plugin-card">' +
                        '<div class="plugin-header"><span class="plugin-name">' + meta.icon + ' ' + p.name + ' ' + version + '</span>' +
                        '<label class="toggle"><input type="checkbox" id="toggle-' + p.id + '"' + (isOn ? ' checked' : '') +
                        ' onchange="onPluginToggle(\\'' + p.id + '\\', this.checked)"><span class="toggle-slider"></span></label></div>' +
                        '<div class="plugin-desc">' + meta.desc + '</div>' +
                        '<div class="plugin-controls"><span class="plugin-mode-label">Level</span>' +
                        '<select class="plugin-select" id="select-' + p.id + '"' + (isOn ? '' : ' disabled') +
                        ' onchange="onPluginMode(\\'' + p.id + '\\', this.value)">' + options + '</select></div></div>';
                }).join('');
            };

            window.onPluginToggle = function(id, checked) {
                const select = document.getElementById('select-' + id);
                if (checked) {
                    // Re-enable: apply the currently-shown non-off level (or default)
                    select.disabled = false;
                    let mode = select.value;
                    if (mode === 'off') {
                        mode = id === 'caveman' ? 'caveman' : 'lite';
                        select.value = mode;
                    }
                    vscode.postMessage({ command: 'setPluginMode', plugin: id, mode: mode });
                } else {
                    select.disabled = true;
                    vscode.postMessage({ command: 'setPluginMode', plugin: id, mode: 'off' });
                }
            };

            window.onPluginMode = function(id, mode) {
                if (mode === 'off') {
                    document.getElementById('toggle-' + id).checked = false;
                    document.getElementById('select-' + id).disabled = true;
                }
                vscode.postMessage({ command: 'setPluginMode', plugin: id, mode: mode });
            };

            window.showRestartBanner = function() {
                document.getElementById('restartBanner').classList.add('visible');
            };

            // Reuse the same restart the Usage tab uses: restarts the Elysia
            // session (compression disable/enable) which is how the local Claude
            // Code session picks up plugin changes.
            window.restartEnvironment = function() {
                vscode.postMessage({ command: 'restartCompression' });
            };

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
                    list.innerHTML = models.map(function(model, index) {
                        const isActive = model === activeModel;
                        const meta = lookupMeta(model);
                        const id = escapeHtml(model);
                        // Handlers receive the row INDEX, not the model ID. An index is
                        // pure digits, so nothing user- or gateway-supplied is ever
                        // interpolated into a JS string literal inside an attribute —
                        // ids containing ' or \ would otherwise break out of the
                        // quoting. The id is resolved at call time from availableModels.
                        //
                        // Second line and ⓘ appear only when metadata exists. A model
                        // missing from the catalog still renders and stays selectable.
                        const infoBtn = meta
                            ? '<button class="model-info-btn" type="button"' +
                              ' aria-label="Details for ' + escapeHtml(meta.label) + '"' +
                              ' onmouseenter="showModelTip(this, ' + index + ')"' +
                              ' onmouseleave="hideModelTip()"' +
                              ' onfocus="showModelTip(this, ' + index + ')"' +
                              ' onblur="hideModelTip()"' +
                              ' onclick="event.stopPropagation()">&#9432;</button>'
                            : '';
                        const metaLine = meta
                            ? '<div class="model-item-meta">' + escapeHtml(meta.line2) + '</div>'
                            : '';
                        return '<div class="model-item ' + (isActive ? 'selected' : '') + '" onclick="selectModelByIndex(' + index + ')">' +
                            '<div class="model-item-head">' +
                            '<span class="model-item-name">' + id + '</span>' +
                            (isActive ? '<span class="model-item-badge">active</span>' : '') +
                            infoBtn +
                            '</div>' +
                            metaLine +
                            '</div>';
                    }).join('');
                }

                loading.style.display = 'none';
                list.style.display = 'block';
                // Only cite the metadata source when there is metadata on screen —
                // not under a "Failed to load models" message.
                document.getElementById('modelFooter').style.display =
                    models.length > 0 ? 'block' : 'none';
            };

            // ===== Model detail tooltip =====
            // position:fixed on <body> so the dropdown's overflow-y:auto cannot clip
            // it. Anchored to the ⓘ button and flipped above when there is no room
            // below, clamped so it never leaves the viewport.
            //
            // Looked up lazily: this script block precedes the tooltip element in the
            // document, so a getElementById at load time would return null.
            function getTooltip() {
                return document.getElementById('modelTooltip');
            }

            function escapeHtml(value) {
                return String(value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            // Own-property lookup. Plain bracket access would reach Object.prototype,
            // so a gateway model named "toString" or "constructor" would look like it
            // had metadata — rendering a literal "undefined" second line and throwing
            // in buildTipHtml — instead of degrading to name-only as documented.
            function lookupMeta(modelId) {
                return Object.prototype.hasOwnProperty.call(MODEL_CATALOG, modelId)
                    ? MODEL_CATALOG[modelId]
                    : undefined;
            }

            function tooltipRow(label, value) {
                return '<div class="model-tooltip-row"><span>' + escapeHtml(label) +
                       '</span><span>' + escapeHtml(value) + '</span></div>';
            }

            function buildTipHtml(meta) {
                // Tiered models (haiku) render both ranges — the list's fixed-width
                // second line cannot, which is exactly why the tooltip exists.
                const rows = [
                    '<div class="model-tooltip-title">' + escapeHtml(meta.label) + '</div>',
                    '<div class="model-tooltip-desc">' + escapeHtml(meta.bestFor) + '</div>',
                    tooltipRow('Context', meta.contextText),
                    tooltipRow('Auto-compact', meta.autoCompactText)
                ];
                meta.inputLines.forEach(function(line, i) {
                    rows.push(tooltipRow(i === 0 ? 'Input' : '', line));
                });
                meta.outputLines.forEach(function(line, i) {
                    rows.push(tooltipRow(i === 0 ? 'Output' : '', line));
                });
                return rows.join('');
            }

            window.showModelTip = function(anchorEl, index) {
                const modelId = availableModels[index];
                const meta = lookupMeta(modelId);
                const tooltip = getTooltip();
                if (!meta || !tooltip) return;

                tooltip.innerHTML = buildTipHtml(meta);
                tooltip.classList.add('open');

                // Measure after the content is in place — the tooltip sizes to its text.
                const anchor = anchorEl.getBoundingClientRect();
                const tipHeight = tooltip.offsetHeight;
                const tipWidth = tooltip.offsetWidth;

                // Clamp top so the tooltip always stays fully on screen, whichever side it
                // lands on. Done before the flip decision so both branches are bounded.
                const maxTop = Math.max(8, window.innerHeight - tipHeight - 8);
                const spaceBelow = window.innerHeight - anchor.bottom;
                const fitsBelow = spaceBelow > tipHeight + 12;

                // Prefer below the anchor; otherwise above. If neither fits, the
                // clamp pins it inside the viewport rather than letting it overflow
                // — and may cover the anchor, so hide on hover-out still applies.
                const desiredTop = fitsBelow
                    ? anchor.bottom + 8
                    : anchor.top - tipHeight - 8;
                tooltip.style.top = Math.max(8, Math.min(desiredTop, maxTop)) + 'px';

                // Right-align to the anchor, then clamp. The upper bound can go
                // negative in a panel narrower than the tooltip (VS Code sidebars
                // are ~300px), so clamp low-to-high instead of Math.min over a
                // possibly-negative bound, which would push it off the left edge.
                const rightAligned = anchor.right - tipWidth;
                const maxLeft = Math.max(8, window.innerWidth - tipWidth - 8);
                tooltip.style.left = Math.max(8, Math.min(rightAligned, maxLeft)) + 'px';
            };

            window.hideModelTip = function() {
                const tooltip = getTooltip();
                if (tooltip) {
                    tooltip.classList.remove('open');
                }
            };

            // Close on scroll: the tooltip is anchored to a captured position and
            // would otherwise stay put while the row it describes scrolls away.
            // Capture phase catches the dropdown's own scroll, not just the window's.
            document.addEventListener('scroll', window.hideModelTip, true);

            // Row-click entry point. Inline attribute handlers are compiled in GLOBAL
            // scope, so they cannot see 'availableModels' (declared with 'let' inside
            // this IIFE). Passing the id as a literal would work but reopens the
            // quoting hole the index approach closed. So the handler passes only the
            // row index, and this function — which does close over 'availableModels'
            // — turns it into a model id.
            window.selectModelByIndex = function(index) {
                const model = availableModels[index];
                if (typeof model === 'string') {
                    window.selectModel(model);
                }
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
                    case 'init':
                        // Switch to initial tab if specified
                        if (message.initialTab) {
                            window.switchTab(message.initialTab);
                        }
                        break;
                    case 'switchTab':
                        // Switch to specified tab
                        if (message.tab) {
                            window.switchTab(message.tab);
                        }
                        break;
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
                    case 'compressionStatsLoaded':
                        // Display detailed compression stats
                        if (message.stats) {
                            window.displayCompressionStats(message.stats);
                        }
                        break;
                    case 'pluginsLoaded':
                        window.displayPlugins(message.plugins);
                        break;
                    case 'pluginModeSet':
                        if (message.success && message.restartRequired) {
                            window.showRestartBanner();
                        } else if (!message.success) {
                            alert('Failed to update plugin: ' + message.error);
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

    <!-- Reused detail tooltip. Lives on <body> rather than inside the dropdown so
         the dropdown's overflow-y:auto cannot clip it. Positioned in JS. -->
    <div class="model-tooltip" id="modelTooltip" role="tooltip"></div>
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
