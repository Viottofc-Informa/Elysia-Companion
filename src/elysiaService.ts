import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(cp.exec);

export interface ElysiaConfig {
  version: string;
  model: string;
  isPrivate: boolean;
  workspace: string;
  configId: string;
  langSmithEnabled: boolean;
  status: string;
  usedAmount: number;
  totalAmount: number;
  percentage: number;
  /** True when the CLI reports "Used: -" — the monthly usage counter has just reset */
  isResetState: boolean;
}

export class ElysiaService {
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  async fetchConfig(): Promise<ElysiaConfig | null> {
    const config = vscode.workspace.getConfiguration('elysiaUsage');
    const elysiaCodePath = config.get<string>('elysiaCodePath', 'elysia-code');

    try {
      // Try the configured path first, then fallback to common locations
      const commandPath = await this.resolveElysiaCommand(elysiaCodePath);

      // Build the command - on Windows, use cmd.exe /c for .cmd files
      const isWindows = process.platform === 'win32';
      const isCmdFile = commandPath.toLowerCase().endsWith('.cmd');
      const execCommand = isWindows && isCmdFile
        ? `cmd.exe /c "${commandPath}"`
        : commandPath;

      this.outputChannel.appendLine(`Executing: ${execCommand} --config`);

      // Use spawn instead of exec to handle large outputs and Unicode issues better
      const stdout = await this.executeCommand(`${execCommand} --config`);

      if (!stdout) {
        this.outputChannel.appendLine('No output from elysia-code command');
        return null;
      }

      return this.parseConfigOutput(stdout);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`Failed to fetch Elysia config: ${errorMessage}`);
      return null;
    }
  }

  private executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellFlag = isWindows ? '/c' : '-c';

      // For Windows .cmd files, command already includes cmd.exe /c
      // For other cases, wrap in shell
      const actualCommand = command.includes('cmd.exe /c') ? command : `${command}`;
      const args = command.includes('cmd.exe /c')
        ? actualCommand.split(' ').slice(1)
        : [shellFlag, actualCommand];

      this.outputChannel.appendLine(`Spawning: ${shell} ${args.join(' ')}`);

      const proc = cp.spawn(shell, args, {
        windowsHide: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        // elysia-code exits with error code 1 due to Unicode bug, but still outputs data
        if (stdout.length > 0) {
          this.outputChannel.appendLine(`Command output received (${stdout.length} chars), exit code: ${code}`);
          if (stderr) {
            this.outputChannel.appendLine(`Stderr (ignoring): ${stderr.substring(0, 200)}`);
          }
          resolve(stdout);
        } else if (stderr) {
          reject(new Error(stderr));
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  private async resolveElysiaCommand(configuredPath: string): Promise<string> {
    const os = process.platform;

    // Test if configured path works
    if (await this.commandExists(configuredPath)) {
      return configuredPath;
    }

    // Windows-specific paths
    if (os === 'win32') {
      const homeDir = process.env.USERPROFILE || process.env.HOME;
      const possiblePaths = [
        `${homeDir}\\.local\\bin\\elysia-code.cmd`,
        `${homeDir}\\.local\\bin\\elysia-code`,
        `${homeDir}\\AppData\\Local\\elysia-code\\elysia-code.exe`,
        'elysia-code.cmd',
        'elysia-code'
      ];

      for (const path of possiblePaths) {
        if (await this.commandExists(path)) {
          this.outputChannel.appendLine(`Found elysia-code at: ${path}`);
          return path;
        }
      }
    }

    // Unix/Linux/macOS paths
    const unixPaths = [
      `${process.env.HOME}/.local/bin/elysia-code`,
      '/usr/local/bin/elysia-code',
      '/usr/bin/elysia-code',
      'elysia-code'
    ];

    for (const path of unixPaths) {
      if (await this.commandExists(path)) {
        this.outputChannel.appendLine(`Found elysia-code at: ${path}`);
        return path;
      }
    }

    // Fallback to configured path if nothing found
    return configuredPath;
  }

  private async commandExists(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Use 'where' on Windows, 'which' on Unix
      const checkCmd = process.platform === 'win32' ? 'where' : 'which';
      const testCmd = command.includes(' ') ? `"${command}"` : command;

      cp.exec(`${checkCmd} ${testCmd} 2>nul`, { timeout: 5000 }, (error) => {
        resolve(!error);
      });
    });
  }

  private parseConfigOutput(output: string): ElysiaConfig | null {
    try {
      const lines = output.split('\n');
      const config: Partial<ElysiaConfig> = {};

      for (const line of lines) {
        const trimmed = line.trim();

        // Parse Version
        if (trimmed.startsWith('Version')) {
          const match = trimmed.match(/:\s*(.+)/);
          if (match) config.version = match[1].trim();
        }

        // Parse Model
        else if (trimmed.startsWith('Model')) {
          const match = trimmed.match(/:\s*(.+)/);
          if (match) config.model = match[1].trim();
        }

        // Parse Private
        else if (trimmed.startsWith('Private')) {
          const match = trimmed.match(/:\s*(.+)/);
          if (match) config.isPrivate = match[1].trim().toLowerCase() === 'true';
        }

        // Parse Workspace
        else if (trimmed.startsWith('Workspace')) {
          const match = trimmed.match(/:\s*(.+)/);
          if (match) config.workspace = match[1].trim();
        }

        // Parse Config ID
        else if (trimmed.startsWith('Config ID')) {
          const match = trimmed.match(/:\s*(.+)/);
          if (match) config.configId = match[1].trim();
        }

        // Parse LangSmith
        else if (trimmed.startsWith('LangSmith')) {
          const match = trimmed.match(/:\s*(.+)/);
          if (match) config.langSmithEnabled = match[1].trim().toLowerCase() === 'enabled';
        }

        // Parse Status
        else if (trimmed.startsWith('Status')) {
          const match = trimmed.match(/:\s*(.+)/);
          if (match) config.status = match[1].trim();
        }

        // Parse Usage - normal format:  "Used       : $115.8067 / $200.00"
        //               reset format:   "Used       : -"
        else if (trimmed.startsWith('Used')) {
          const match = trimmed.match(/:\s*\$([\d.]+)\s*\/\s*\$([\d.]+)/);
          if (match) {
            config.usedAmount = parseFloat(match[1]);
            config.totalAmount = parseFloat(match[2]);
          } else if (trimmed.match(/:\s*-/)) {
            // Month just reset — CLI reports "-" for both used and total
            config.usedAmount = 0;
            config.totalAmount = 0;
            config.isResetState = true;
          }
        }
      }

      // Calculate percentage (0% when reset state — totalAmount is 0)
      if (config.usedAmount !== undefined && config.totalAmount !== undefined && config.totalAmount > 0) {
        config.percentage = (config.usedAmount / config.totalAmount) * 100;
      } else {
        config.percentage = 0;
      }

      // Default isResetState to false when not set
      if (config.isResetState === undefined) {
        config.isResetState = false;
      }

      // Validate required fields (usedAmount/totalAmount are allowed to be 0 in reset state)
      if (!config.version || config.usedAmount === undefined || config.totalAmount === undefined) {
        this.outputChannel.appendLine('Failed to parse required fields from Elysia config');
        return null;
      }

      return config as ElysiaConfig;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`Error parsing config: ${errorMessage}`);
      return null;
    }
  }

  getStatusColor(percentage: number): string {
    // Lighthouse thresholds: <45% green, 45-85% yellow, >85% red
    if (percentage >= 85) {
      return '#f14c4c'; // Red - critical
    } else if (percentage >= 45) {
      return '#ffcc00'; // Yellow - warning
    }
    return '#4ec9b0'; // Green - healthy
  }

  getStatusText(percentage: number): string {
    // Lighthouse icon thresholds: <45% green, 45-85% yellow, >85% red
    if (percentage >= 85) {
      return '$(testing-failed-icon)'; // Red lighthouse (or use '🚨')
    } else if (percentage >= 45) {
      return '$(warning)'; // Yellow warning
    }
    return '$(check)'; // Green check
  }

  getLighthouseEmoji(percentage: number): string {
    // Alternative: use emoji lighthouses
    if (percentage >= 85) {
      return '🔴'; // Red circle/faro
    } else if (percentage >= 45) {
      return '🟡'; // Yellow circle/faro
    }
    return '🟢'; // Green circle/faro
  }

  async restartCompression(): Promise<{ success: boolean; message: string; details?: string }> {
    try {
      const config = vscode.workspace.getConfiguration('elysiaUsage');
      const elysiaCodePath = config.get<string>('elysiaCodePath', 'elysia-code');
      const commandPath = await this.resolveElysiaCommand(elysiaCodePath);

      // Build the command for Windows
      const isWindows = process.platform === 'win32';
      const isCmdFile = commandPath.toLowerCase().endsWith('.cmd');
      const baseCommand = isWindows && isCmdFile
        ? `cmd.exe /c "${commandPath}"`
        : commandPath;

      this.outputChannel.appendLine('[ElysiaService] Starting compression restart sequence...');

      // Step 1: Disable compression
      this.outputChannel.appendLine('[ElysiaService] Step 1: Disabling compression...');
      const disableOutput = await this.executeCommand(`${baseCommand} --compression-disable`);
      this.outputChannel.appendLine(`[ElysiaService] Disable output: ${disableOutput.substring(0, 500)}`);

      if (!disableOutput.includes('Compression disabled')) {
        return {
          success: false,
          message: 'Failed to disable compression',
          details: disableOutput
        };
      }

      // Step 2: Enable compression
      this.outputChannel.appendLine('[ElysiaService] Step 2: Enabling compression...');
      const enableOutput = await this.executeCommand(`${baseCommand} --compression-enable`);
      this.outputChannel.appendLine(`[ElysiaService] Enable output: ${enableOutput.substring(0, 500)}`);

      if (!enableOutput.includes('Compression enabled') || !enableOutput.includes('port 8787')) {
        return {
          success: false,
          message: 'Failed to enable compression',
          details: enableOutput
        };
      }

      // Success!
      return {
        success: true,
        message: 'Compression restarted successfully',
        details: enableOutput
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[ElysiaService] Error restarting compression: ${errorMessage}`);
      return {
        success: false,
        message: `Error: ${errorMessage}`,
        details: errorMessage
      };
    }
  }

  // Get available models from elysia-code --models
  async getModels(): Promise<{ models: string[], activeModel: string }> {
    try {
      const config = vscode.workspace.getConfiguration('elysiaUsage');
      const elysiaCodePath = config.get<string>('elysiaCodePath', 'elysia-code');
      const commandPath = await this.resolveElysiaCommand(elysiaCodePath);

      const isWindows = process.platform === 'win32';
      const isCmdFile = commandPath.toLowerCase().endsWith('.cmd');
      const execCommand = isWindows && isCmdFile
        ? `cmd.exe /c "${commandPath}"`
        : commandPath;

      this.outputChannel.appendLine(`[ElysiaService] Fetching available models...`);
      const output = await this.executeCommand(`${execCommand} --models`);
      this.outputChannel.appendLine(`[ElysiaService] Models output: ${output.substring(0, 500)}`);

      return this.parseModelsOutput(output);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[ElysiaService] Error fetching models: ${errorMessage}`);
      return { models: [], activeModel: 'unknown' };
    }
  }

  // Parse --models output
  private parseModelsOutput(output: string): { models: string[], activeModel: string } {
    const lines = output.split('\n');
    const models: string[] = [];
    let activeModel = 'unknown';

    // Skip header lines ("Available models", "-----------------")
    let started = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and header
      if (!trimmed || trimmed === 'Available models' || trimmed.startsWith('---')) {
        continue;
      }

      // Check for "active" indicator
      if (trimmed.includes('← active')) {
        const modelName = trimmed.replace(/\s*← active/, '').trim();
        if (modelName) {
          models.push(modelName);
          activeModel = modelName;
        }
      } else if (trimmed && !trimmed.startsWith('OK')) {
        // Regular model line
        const modelName = trimmed.split(/\s+/)[0]; // Get first word
        if (modelName && modelName !== 'Available' && modelName !== 'models') {
          models.push(modelName);
        }
      }
    }

    this.outputChannel.appendLine(`[ElysiaService] Found ${models.length} models, active: ${activeModel}`);
    return { models, activeModel };
  }

  // Change to a specific model
  async changeModel(modelName: string): Promise<boolean> {
    try {
      const config = vscode.workspace.getConfiguration('elysiaUsage');
      const elysiaCodePath = config.get<string>('elysiaCodePath', 'elysia-code');
      const commandPath = await this.resolveElysiaCommand(elysiaCodePath);

      // Build the command - use double quotes for Windows paths
      const isWindows = process.platform === 'win32';
      const isCmdFile = commandPath.toLowerCase().endsWith('.cmd');
      const execPath = isWindows && isCmdFile
        ? `"${commandPath}"`
        : commandPath;

      this.outputChannel.appendLine(`[ElysiaService] Changing model to: ${modelName}`);
      this.outputChannel.appendLine(`[ElysiaService] Using exec: ${execPath} --model ${modelName}`);

      // Use execAsync instead of spawn to avoid argument parsing issues
      const { stdout, stderr } = await execAsync(`${execPath} --model "${modelName}"`, {
        timeout: 30000,
        windowsHide: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      const output = stdout || stderr || '';
      this.outputChannel.appendLine(`[ElysiaService] Change model output (${output.length} chars): ${output.substring(0, 500)}`);

      // Normalize output: lowercase + collapse whitespace to avoid encoding/spacing issues
      const normalized = output.toLowerCase().replace(/\s+/g, ' ');

      // Check success patterns (normalized)
      const hasOk = normalized.includes('ok');
      const hasUpdated = normalized.includes('model updated')
        || normalized.includes('model changed')
        || normalized.includes('updated')
        || normalized.includes('changed');
      const hasModelName = output.toLowerCase().includes(modelName.toLowerCase());

      this.outputChannel.appendLine(`[ElysiaService] hasOk=${hasOk}, hasUpdated=${hasUpdated}, hasModelName=${hasModelName}`);

      // (hasOk AND hasUpdated) OR modelName appears in output
      const success = (hasOk && hasUpdated) || hasModelName;

      if (success) {
        this.outputChannel.appendLine(`[ElysiaService] Model changed successfully to ${modelName}`);
      } else {
        this.outputChannel.appendLine(`[ElysiaService] Model change FAILED. Full output: ${output}`);
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[ElysiaService] Error changing model: ${errorMessage}`);
      return false;
    }
  }

  // Get compression status
  async getCompressionStatus(): Promise<{ enabled: boolean; output: string }> {
    try {
      const config = vscode.workspace.getConfiguration('elysiaUsage');
      const elysiaCodePath = config.get<string>('elysiaCodePath', 'elysia-code');
      const commandPath = await this.resolveElysiaCommand(elysiaCodePath);

      const isWindows = process.platform === 'win32';
      const isCmdFile = commandPath.toLowerCase().endsWith('.cmd');
      const execCommand = isWindows && isCmdFile
        ? `cmd.exe /c "${commandPath}"`
        : commandPath;

      this.outputChannel.appendLine(`[ElysiaService] Fetching compression status...`);
      const output = await this.executeCommand(`${execCommand} --compression-stats`);
      this.outputChannel.appendLine(`[ElysiaService] Compression status: ${output.substring(0, 500)}`);

      // Parse output - look for "Status : enabled" or "Status : disabled"
      const normalized = output.toLowerCase();
      const enabled = normalized.includes('enabled') ||
                     (normalized.includes('status') &&
                      normalized.includes('enabled') ||
                      normalized.includes(' Status  : enabled'));

      this.outputChannel.appendLine(`[ElysiaService] Compression enabled: ${enabled}`);
      return { enabled, output };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[ElysiaService] Error fetching compression status: ${errorMessage}`);
      return { enabled: false, output: '' };
    }
  }

  // Toggle private mode
  async togglePrivateMode(enable: boolean): Promise<boolean> {
    try {
      const config = vscode.workspace.getConfiguration('elysiaUsage');
      const elysiaCodePath = config.get<string>('elysiaCodePath', 'elysia-code');
      const commandPath = await this.resolveElysiaCommand(elysiaCodePath);

      // Build the command
      const isWindows = process.platform === 'win32';
      const isCmdFile = commandPath.toLowerCase().endsWith('.cmd');
      const execPath = isWindows && isCmdFile
        ? `"${commandPath}"`
        : commandPath;

      this.outputChannel.appendLine(`[ElysiaService] Toggling private mode to: ${enable}`);
      const { stdout, stderr } = await execAsync(`${execPath} --private ${enable}`, {
        timeout: 30000,
        windowsHide: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      const output = stdout || stderr || '';
      this.outputChannel.appendLine(`[ElysiaService] Private mode output (${output.length} chars): ${output.substring(0, 500)}`);

      // Check success - look for "OK" and either "enabled" or "disabled"
      const normalized = output.toLowerCase();
      const success = normalized.includes('ok') &&
        (normalized.includes('enabled') || normalized.includes('disabled'));

      if (success) {
        this.outputChannel.appendLine(`[ElysiaService] Private mode ${enable ? 'enabled' : 'disabled'} successfully`);
      } else {
        this.outputChannel.appendLine(`[ElysiaService] Failed to toggle private mode`);
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`[ElysiaService] Error toggling private mode: ${errorMessage}`);
      return false;
    }
  }
}
