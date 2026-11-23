import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * SettingsService — reads and writes elysia-code plugin state persisted in
 * ~/.claude/settings.json (the `env` block). Cross-platform via os.homedir().
 *
 * Behavioural rules (see architecture/plans/plugin_manager_plan.md):
 *  - Only CAVEMAN_DEFAULT_MODE / PONYTAIL_DEFAULT_MODE are ever written.
 *  - Every other key is preserved byte-identically (round-trip via JSON parse).
 *  - Writes are atomic: temp file + rename.
 *  - A corrupt / unparseable settings.json is never overwritten; read returns
 *    null and setPluginMode throws.
 *  - Tracing and Shunt are read-only (no off switch exposed to the user).
 */

export type ControllablePlugin = 'caveman' | 'ponytail';

export interface PluginState {
  id: 'caveman' | 'ponytail' | 'tracing' | 'shunt';
  name: string;
  version?: string;
  controllable: boolean;
  /** Current mode. For read-only plugins this is 'on' | 'off' display state. */
  mode: string;
  /** Allowed modes for controllable plugins. */
  modes?: string[];
}

const CAVEMAN_MODES = ['caveman', 'manual', 'off'];
const PONYTAIL_MODES = ['lite', 'full', 'ultra', 'off'];

export class SettingsService {
  private readonly settingsPath: string;

  constructor(settingsPath?: string) {
    this.settingsPath =
      settingsPath ?? path.join(os.homedir(), '.claude', 'settings.json');
  }

  /** Read and parse settings.json. Returns null if missing or corrupt. */
  private readSettings(): Record<string, any> | null {
    try {
      if (!fs.existsSync(this.settingsPath)) {
        return null;
      }
      const raw = fs.readFileSync(this.settingsPath, 'utf8');
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null; // corrupt or unreadable — never overwrite
    }
  }

  /** Whether a settings.json was found and parsed. */
  public settingsAvailable(): boolean {
    return this.readSettings() !== null;
  }

  /** Snapshot of all four plugins' current state. */
  public getPluginStates(): PluginState[] | null {
    const settings = this.readSettings();
    if (!settings) {
      return null;
    }
    const env = settings.env ?? {};

    const tracingOn = String(env.TRACE_TO_LANGSMITH).toLowerCase() === 'true';
    // Shunt is "on" when its routing vars are present (it has no off switch).
    const shuntOn = Boolean(env.SHUNT_READ_MODEL || env.SHUNT_BASE_URL);

    return [
      {
        id: 'caveman',
        name: 'Caveman',
        version: '4.1.0',
        controllable: true,
        mode: typeof env.CAVEMAN_DEFAULT_MODE === 'string' ? env.CAVEMAN_DEFAULT_MODE : 'caveman',
        modes: CAVEMAN_MODES
      },
      {
        id: 'ponytail',
        name: 'Ponytail',
        version: '5.3.3',
        controllable: true,
        mode: typeof env.PONYTAIL_DEFAULT_MODE === 'string' ? env.PONYTAIL_DEFAULT_MODE : 'lite',
        modes: PONYTAIL_MODES
      },
      {
        id: 'tracing',
        name: 'Tracing',
        controllable: false,
        mode: tracingOn ? 'on' : 'off'
      },
      {
        id: 'shunt',
        name: 'Shunt',
        controllable: false,
        mode: shuntOn ? 'on' : 'off'
      }
    ];
  }

  /**
   * Set a controllable plugin's mode, writing atomically.
   * Throws on read/parse/write failure or invalid plugin/mode.
   */
  public setPluginMode(plugin: ControllablePlugin, mode: string): void {
    const key = plugin === 'caveman' ? 'CAVEMAN_DEFAULT_MODE' : 'PONYTAIL_DEFAULT_MODE';
    const allowed = plugin === 'caveman' ? CAVEMAN_MODES : PONYTAIL_MODES;
    if (!allowed.includes(mode)) {
      throw new Error(`Invalid mode "${mode}" for ${plugin}. Allowed: ${allowed.join(', ')}`);
    }

    const settings = this.readSettings();
    if (!settings) {
      throw new Error('settings.json not found or unreadable — refusing to write.');
    }

    settings.env = settings.env ?? {};
    settings.env[key] = mode;

    const serialized = JSON.stringify(settings, null, 2);
    const dir = path.dirname(this.settingsPath);
    const tmpPath = path.join(dir, `.settings.json.${process.pid}.tmp`);
    fs.writeFileSync(tmpPath, serialized, 'utf8');
    fs.renameSync(tmpPath, this.settingsPath); // atomic on same volume
  }
}
