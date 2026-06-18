import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppSettings, ThemeMode } from '../../../shared/types';
import { DEFAULT_APP_SETTINGS } from '../../../shared/types';

interface SettingsContextValue {
  settings: AppSettings;
  theme: ThemeMode;
  ready: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.jiboStudio
      .getSettings()
      .then((loaded) => {
        if (cancelled) return;
        setSettings(loaded);
        applyTheme(loaded.theme);
        setReady(true);
      })
      .catch((error) => {
        console.error('Failed to load settings', error);
        if (!cancelled) {
          applyTheme(DEFAULT_APP_SETTINGS.theme);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await window.jiboStudio.updateSettings(patch);
    setSettings(next);
    if (patch.theme) {
      applyTheme(next.theme);
    }
  }, []);

  const value = useMemo(
    () => ({
      settings,
      theme: settings.theme,
      ready,
      updateSettings,
    }),
    [settings, ready, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
