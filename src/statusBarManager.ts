import * as vscode from 'vscode';
import { ElysiaService, ElysiaConfig } from './elysiaService';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private compressionStatusItem: vscode.StatusBarItem;
  private privateStatusItem: vscode.StatusBarItem;
  private elysiaService: ElysiaService;
  private outputChannel: vscode.OutputChannel;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isLoading: boolean = false;
  private currentConfig: ElysiaConfig | null = null;

  constructor(
    elysiaService: ElysiaService,
    outputChannel: vscode.OutputChannel
  ) {
    this.elysiaService = elysiaService;
    this.outputChannel = outputChannel;

    // Create main status bar item (right-aligned, high priority)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    // Create compression status bar item (right-aligned, lower priority)
    this.compressionStatusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );

    // Create private status bar item (right-aligned, lowest priority)
    this.privateStatusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      98
    );

    // Set up click handlers
    this.statusBarItem.command = 'elysiaUsage.showDetails';
    this.privateStatusItem.command = 'elysiaUsage.togglePrivateMode';

    // Initialize with loading state
    this.setLoadingState();
  }

  async initialize(): Promise<void> {
    this.show();
    await this.refresh();
    this.startAutoRefresh();
  }

  show(): void {
    this.statusBarItem.show();
    this.compressionStatusItem.show();
    this.privateStatusItem.show();
  }

  hide(): void {
    this.statusBarItem.hide();
    this.compressionStatusItem.hide();
    this.privateStatusItem.hide();
  }

  dispose(): void {
    this.stopAutoRefresh();
    this.statusBarItem.dispose();
    this.compressionStatusItem.dispose();
    this.privateStatusItem.dispose();
  }

  async updateCompressionDisplay(): Promise<void> {
    try {
      const compressionStatus = await this.elysiaService.getCompressionStatus();
      const enabled = compressionStatus.enabled;

      // Use emoji based on status
      const statusEmoji = enabled ? '🟢' : '🔴';

      this.compressionStatusItem.text = `${statusEmoji} Compression`;
      this.compressionStatusItem.tooltip = `Compression is ${enabled ? 'enabled' : 'disabled'}\n\nClick for details`;
      this.compressionStatusItem.backgroundColor = enabled
        ? undefined
        : new vscode.ThemeColor('statusBarItem.errorBackground');
    } catch (error) {
      this.compressionStatusItem.text = '⚪ Compression';
      this.compressionStatusItem.tooltip = 'Compression status unknown';
    }
  }

  updatePrivateDisplay(config: ElysiaConfig): void {
    const isPrivate = config.isPrivate;

    // Use lock/unlock icons based on status
    const icon = isPrivate ? '$(lock)' : '$(unlock)';
    const text = isPrivate ? 'Private' : 'Standard';

    this.privateStatusItem.text = `${icon} ${text}`;
    this.privateStatusItem.tooltip = `Privacy mode is ${isPrivate ? 'enabled (Private)' : 'disabled (Standard)'}\n\nClick to toggle`;
    this.privateStatusItem.backgroundColor = isPrivate
      ? new vscode.ThemeColor('statusBarItem.warningBackground')
      : undefined;
  }

  setLoadingState(): void {
    this.isLoading = true;
    this.statusBarItem.text = '$(loading~spin) Elysia...';
    this.statusBarItem.tooltip = 'Loading Elysia usage data...';
    this.statusBarItem.backgroundColor = undefined;
  }

  setErrorState(message: string): void {
    this.isLoading = false;
    this.statusBarItem.text = '$(error) Elysia';
    this.statusBarItem.tooltip = `Error: ${message}\n\nClick to retry`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }

  updateDisplay(config: ElysiaConfig): void {
    this.isLoading = false;
    const settings = vscode.workspace.getConfiguration('elysiaUsage');
    const showDollar = settings.get<boolean>('showDollarAmount', true);
    const showPercentage = settings.get<boolean>('showPercentage', true);

    // Build display text
    const parts: string[] = [];

    if (showDollar) {
      parts.push(`$${config.usedAmount.toFixed(2)}`);
    }

    if (showPercentage) {
      parts.push(`${config.percentage.toFixed(1)}%`);
    }

    // Use icon based on status
    const statusIcon = this.elysiaService.getStatusText(config.percentage);

    // Use lighthouse emoji for visual indicator
    const lighthouseEmoji = this.elysiaService.getLighthouseEmoji(config.percentage);

    this.statusBarItem.text = `${lighthouseEmoji} ${parts.join(' / ')}`;

    // Set tooltip with detailed info
    this.statusBarItem.tooltip = this.buildTooltip(config);

    // Set background color based on lighthouse thresholds: <45% green, 45-85% yellow, >85% red
    if (config.percentage >= 85) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (config.percentage >= 45) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.statusBarItem.backgroundColor = undefined;
    }
  }

  private buildTooltip(config: ElysiaConfig): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`## Elysia Usage\n\n`);
    tooltip.appendMarkdown(`**Used:** $${config.usedAmount.toFixed(2)} of $${config.totalAmount.toFixed(2)}\n\n`);
    tooltip.appendMarkdown(`**Consumed:** ${config.percentage.toFixed(1)}%\n\n`);
    tooltip.appendMarkdown(`---\n\n`);
    tooltip.appendMarkdown(`**Version:** ${config.version}\n\n`);
    tooltip.appendMarkdown(`**Model:** ${config.model}\n\n`);
    tooltip.appendMarkdown(`**Workspace:** ${config.workspace}\n\n`);
    tooltip.appendMarkdown(`**Status:** ${config.status}\n\n`);

    if (config.langSmithEnabled) {
      tooltip.appendMarkdown(`✓ LangSmith enabled\n\n`);
    }

    tooltip.appendMarkdown(`---\n\n`);
    const lighthouseEmoji = this.elysiaService.getLighthouseEmoji(config.percentage);
    tooltip.appendMarkdown(`${lighthouseEmoji} Current usage: ${config.percentage.toFixed(1)}%\n\n`);
    tooltip.appendMarkdown(`🖱️ **Click** to open dashboard\n`);
    tooltip.appendMarkdown(`🖱️ **Right-click** for options`);

    tooltip.isTrusted = true;
    return tooltip;
  }

  async refresh(): Promise<void> {
    // Don't skip if loading - force a refresh
    this.setLoadingState();

    try {
      this.outputChannel.appendLine('[StatusBar] Fetching config...');
      const config = await this.elysiaService.fetchConfig();

      if (config) {
        this.outputChannel.appendLine(`[StatusBar] Config received: $${config.usedAmount.toFixed(2)} / $${config.totalAmount.toFixed(2)}`);
        this.updateDisplay(config);
        this.outputChannel.appendLine(
          `[${new Date().toISOString()}] Updated: $${config.usedAmount.toFixed(2)} / $${config.totalAmount.toFixed(2)} (${config.percentage.toFixed(1)}%)`
        );

        // Also update compression and private status
        await this.updateCompressionDisplay();
        this.updatePrivateDisplay(config);
      } else {
        this.outputChannel.appendLine('[StatusBar] Config is null - setting error state');
        this.setErrorState('Failed to fetch usage data');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.setErrorState(message);
      this.outputChannel.appendLine(`Refresh error: ${message}`);
    }
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh();

    const config = vscode.workspace.getConfiguration('elysiaUsage');
    const interval = config.get<number>('refreshInterval', 300000);

    if (interval > 0) {
      this.refreshInterval = setInterval(() => {
        this.refresh().catch(err => {
          this.outputChannel.appendLine(`Auto-refresh error: ${err}`);
        });
      }, interval);

      this.outputChannel.appendLine(`Auto-refresh started (${interval}ms interval)`);
    }
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      this.outputChannel.appendLine('Auto-refresh stopped');
    }
  }

  restartAutoRefresh(): void {
    this.startAutoRefresh();
  }
}
