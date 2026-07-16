import { useState } from 'react';
import { CloseIcon } from './icons';
import './wizard.css';

export type SourceChoice = 'legacy' | 'dsl';

interface SourceChoiceDialogProps {
  projectName: string;
  busy?: boolean;
  error?: string | null;
  onChoose: (choice: SourceChoice) => void;
  onCancel: () => void;
}

export function SourceChoiceDialog({
  projectName,
  busy = false,
  error = null,
  onChoose,
  onCancel,
}: SourceChoiceDialogProps) {
  const [choice, setChoice] = useState<SourceChoice>('dsl');

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true" aria-labelledby="source-choice-title">
      <div className="wizard">
        <header className="wizard__header">
          <h2 id="source-choice-title">How should Studio open this skill?</h2>
          <button type="button" className="wizard__close" onClick={onCancel} aria-label="Cancel" disabled={busy}>
            <CloseIcon size={22} />
          </button>
        </header>
        <div className="wizard__body">
          <p className="wizard__lead">
            <strong>{projectName}</strong> looks like a classic Jibo skill that hasn&apos;t been opened
            in Jibo Studio before. Pick how you want to work with it.
          </p>
          <fieldset className="wizard__template">
            <legend>Source format</legend>
            <label className="wizard__radio">
              <input
                type="radio"
                name="source-choice"
                checked={choice === 'dsl'}
                disabled={busy}
                onChange={() => setChoice('dsl')}
              />
              <span>
                <strong>Migrate to JiboScript</strong> — generate a <code>skill.jibo</code> from the
                existing Flow, Behavior, MIM, and Rule files (recommended for new work)
              </span>
            </label>
            <label className="wizard__radio">
              <input
                type="radio"
                name="source-choice"
                checked={choice === 'legacy'}
                disabled={busy}
                onChange={() => setChoice('legacy')}
              />
              <span>
                <strong>Keep legacy</strong> — edit the existing <code>.flow</code> / <code>.bt</code>{' '}
                / <code>.mim</code> / <code>.rule</code> files directly
              </span>
            </label>
          </fieldset>
          {choice === 'dsl' ? (
            <p className="wizard__note">
              Migration is best-effort. Branching flows and uncommon behavior nodes may need a quick
              pass in <code>skill.jibo</code> afterward.
            </p>
          ) : (
            <p className="wizard__note">
              You can migrate later by creating a JiboScript project and copying logic over — this
              choice just stops Studio from asking again.
            </p>
          )}
          {error ? <p className="wizard__error">{error}</p> : null}
        </div>
        <footer className="wizard__footer">
          <button type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <div className="wizard__footer-spacer" />
          <button type="button" disabled={busy} onClick={() => onChoose(choice)}>
            {busy ? 'Working…' : choice === 'dsl' ? 'Migrate' : 'Keep Legacy'}
          </button>
        </footer>
      </div>
    </div>
  );
}
