import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from './paths';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../shared/types';

const SETTINGS_FILE = 'settings.json';

function settingsPath(): string {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, SETTINGS_FILE);
}

function normalizeSettings(raw: unknown): AppSettings {
  const settings: AppSettings = { ...DEFAULT_APP_SETTINGS };
  if (typeof raw !== 'object' || raw === null) return settings;

  const record = raw as Record<string, unknown>;
  if (record.theme === 'light' || record.theme === 'dark') {
    settings.theme = record.theme;
  }

  return settings;
}

export function loadSettings(): AppSettings {
  const path = settingsPath();
  if (!existsSync(path)) return { ...DEFAULT_APP_SETTINGS };
  try {
    return normalizeSettings(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): AppSettings {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  return saveSettings({ ...loadSettings(), ...patch });
}
