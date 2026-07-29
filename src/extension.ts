import * as vscode from 'vscode';
import { ElysiaService, ElysiaConfig } from './elysiaService';
import { StatusBarManager } from './statusBarManager';
import { DetailsPanel } from './detailsPanel';

let statusBarManager: StatusBarManager | null = null;
let elysiaService: ElysiaService | null = null;
let outputChannel: vscode.OutputChannel | null = null;

export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('Elysia Usage Tracker');
  context.subscriptions.push(outputChannel);

  outputChannel.appendLine('Elysia Usage Tracker extension activating...');

  // Check if tracking is enabled
  const config = vscode.workspace.getConfiguration('elysiaUsage');
  const isEnabled = config.get<boolean>('enableTracking', true);

  if (!isEnabled) {
    outputChannel.appendLine('Elysia usage tracking is disabled in settings');
    return;
  }

  // Initialize services
  elysiaService = new ElysiaService(outputChannel);
  statusBarManager = new StatusBarManager(elysiaService, outputChannel);

  // Register disposables
  context.subscriptions.push(
    statusBarManager as StatusBarManager,
    outputChannel
  );

  // Register commands
  const disposableCommands = [
    vscode.commands.registerCommand('elysiaUsage.refresh', async () => {
      if (statusBarManager) {
        await statusBarManager.refresh();
        vscode.window.showInformationMessage('Elysia usage data refreshed');
      }
    }),

    vscode.commands.registerCommand('elysiaUsage.showDetails', async () => {
      if (!elysiaService) {
        vscode.window.showErrorMessage('Elysia service not initialized');
        return;
      }

      const config = await elysiaService.fetchConfig();
      if (config) {
        DetailsPanel.show(config, context.extensionUri);
      } else {
        vscode.window.showErrorMessage('Failed to fetch Elysia usage details');
      }
    }),

    vscode.commands.registerCommand('elysiaUsage.openSettings', () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'elysiaUsage'
      );
    }),

    vscode.commands.registerCommand('elysiaUsage.restartCompression', async () => {
      if (!elysiaService) {
        vscode.window.showErrorMessage('Elysia service not initialized');
        return;
      }

      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Restarting Elysia...',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Disabling compression...' });

        const service = elysiaService!; // Non-null assertion after check
        const result = await service.restartCompression();

        if (result.success) {
          progress.report({ increment: 100, message: 'Done!' });
          vscode.window.showInformationMessage(
            '✅ Elysia restarted successfully! Port 8787 is active.',
            'Restart VS Code'
          ).then(selection => {
            if (selection === 'Restart VS Code') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
        } else {
          vscode.window.showErrorMessage(
            `❌ Failed to restart: ${result.message}`,
            'View Details'
          ).then(selection => {
            if (selection === 'View Details') {
              vscode.commands.executeCommand('elysiaUsage.showDetails');
            }
          });
        }
      });
    }),

    // Get available models
    vscode.commands.registerCommand('elysiaUsage.getModels', async () => {
      if (!elysiaService) {
        return { models: [], activeModel: 'unknown' };
      }
      return await elysiaService.getModels();
    }),

    // Change model
    vscode.commands.registerCommand('elysiaUsage.changeModel', async (modelName: string) => {
      if (!elysiaService) {
        throw new Error('Elysia service not initialized');
      }

      const success = await elysiaService.changeModel(modelName);
      if (!success) {
        throw new Error(`Failed to change model to ${modelName}`);
      }
    })
  ];

  context.subscriptions.push(...disposableCommands);

  // Initialize status bar
  statusBarManager.initialize().then(() => {
    outputChannel?.appendLine('Elysia Usage Tracker initialized successfully');
  }).catch((error: Error) => {
    outputChannel?.appendLine(`Failed to initialize: ${error.message}`);
    vscode.window.showErrorMessage(`Elysia Usage Tracker: ${error.message}`);
  });

  // Watch configuration changes
  const configWatcher = vscode.workspace.onDidChangeConfiguration(async (e) => {
    if (e.affectsConfiguration('elysiaUsage')) {
      const newConfig = vscode.workspace.getConfiguration('elysiaUsage');
      const newEnabled = newConfig.get<boolean>('enableTracking', true);

      if (!newEnabled) {
        statusBarManager?.hide();
        outputChannel?.appendLine('Tracking disabled via settings');
      } else {
        statusBarManager?.show();
        statusBarManager?.restartAutoRefresh();
        outputChannel?.appendLine('Settings updated, tracking re-enabled');
      }

      // Refresh display with new settings
      statusBarManager?.refresh();
    }
  });

  context.subscriptions.push(configWatcher);

  // Register workspace context
  vscode.commands.executeCommand('setContext', 'elysiaUsage:enabled', isEnabled);
}

export function deactivate() {
  if (statusBarManager) {
    statusBarManager.dispose();
    statusBarManager = null;
  }

  if (elysiaService) {
    elysiaService = null;
  }

  if (outputChannel) {
    outputChannel.appendLine('Elysia Usage Tracker deactivated');
    outputChannel.dispose();
    outputChannel = null;
  }
}
