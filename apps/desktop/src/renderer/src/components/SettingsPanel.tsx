import { useSettings } from '../context/SettingsContext';
import type { ThemeMode } from '../../../shared/types';
import { MaterialIcon } from './icons';
import './settings.css';

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string; icon: string }[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright interface for well-lit environments',
    icon: 'light_mode',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Balanced dark gray interface',
    icon: 'dark_mode',
  },
  {
    value: 'deep-dark',
    label: 'Deep Dark',
    description: 'Near-black interface with maximum contrast',
    icon: 'bedtime',
  },
];

export function SettingsPanel() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="settings">
      <div className="settings__header">Settings</div>

      <section className="settings__section" aria-labelledby="settings-appearance">
        <h2 id="settings-appearance" className="settings__section-title">
          Appearance
        </h2>
        <p className="settings__section-desc">Customize how Jibo Studio looks.</p>

        <fieldset className="settings__fieldset">
          <legend className="settings__label">Theme</legend>
          <div className="settings__option-list">
            {THEME_OPTIONS.map((option) => {
              const selected = settings.theme === option.value;
              return (
                <label
                  key={option.value}
                  className={`settings__option${selected ? ' settings__option--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={selected}
                    onChange={() => updateSettings({ theme: option.value })}
                  />
                  <span className="settings__option-icon" aria-hidden>
                    <MaterialIcon name={option.icon} size={18} />
                  </span>
                  <span className="settings__option-body">
                    <span className="settings__option-label">{option.label}</span>
                    <span className="settings__option-desc">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>
    </div>
  );
}
