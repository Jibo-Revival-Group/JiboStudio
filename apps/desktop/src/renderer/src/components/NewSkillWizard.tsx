import { useState } from 'react';
import { CloseIcon } from './icons';
import './wizard.css';

interface NewSkillWizardProps {
  onClose: () => void;
  onCreated: (projectPath: string) => void;
}

export function NewSkillWizard({ onClose, onCreated }: NewSkillWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('my-skill');
  const [displayName, setDisplayName] = useState('My Skill');
  const [launchPhrase, setLaunchPhrase] = useState('hey jibo');
  const [parentDir, setParentDir] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFolder = async () => {
    const dir = await window.jiboStudio.createProjectFolder();
    if (dir) setParentDir(dir);
  };

  const create = async () => {
    if (!parentDir) {
      setError('Choose a parent folder first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await window.jiboStudio.createSkill({
        targetDir: parentDir,
        name,
        displayName,
        launchPhrase,
      });
      if (result.success) {
        onCreated(`${parentDir}/${name}`);
      } else {
        setError(result.output || 'Skill creation failed.');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard">
        <header className="wizard__header">
          <h2>New Jibo Skill</h2>
          <button type="button" className="wizard__close" onClick={onClose} aria-label="Close">
            <CloseIcon size={22} />
          </button>
        </header>
        <div className="wizard__steps">
          <span className={step >= 1 ? 'active' : ''}>1. Details</span>
          <span className={step >= 2 ? 'active' : ''}>2. Location</span>
          <span className={step >= 3 ? 'active' : ''}>3. Create</span>
        </div>
        <div className="wizard__body">
          {step === 1 && (
            <>
              <label>
                Package name (folder name)
                <input value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, '-'))} />
              </label>
              <label>
                Display name
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </label>
              <label>
                Launch phrase
                <input value={launchPhrase} onChange={(e) => setLaunchPhrase(e.target.value)} />
                <small>What users say to launch this skill</small>
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <label>
                Parent folder
                <div className="wizard__folder">
                  <input value={parentDir ?? ''} readOnly placeholder="Choose folder..." />
                  <button type="button" onClick={pickFolder}>
                    Browse
                  </button>
                </div>
              </label>
              <p className="wizard__preview">
                Skill will be created at: <code>{parentDir ? `${parentDir}/${name}` : '...'}</code>
              </p>
            </>
          )}
          {step === 3 && (
            <div className="wizard__summary">
              <h3>Ready to create</h3>
              <ul>
                <li><strong>Name:</strong> {name}</li>
                <li><strong>Display:</strong> {displayName}</li>
                <li><strong>Launch:</strong> "{launchPhrase}"</li>
                <li><strong>Template:</strong> starter-skill</li>
              </ul>
              <p>This will copy the starter-skill template, run npm install, and build.</p>
            </div>
          )}
          {error && <div className="wizard__error">{error}</div>}
        </div>
        <footer className="wizard__footer">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} disabled={busy}>
              Back
            </button>
          )}
          <div className="wizard__footer-spacer" />
          {step < 3 ? (
            <button type="button" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button type="button" onClick={create} disabled={busy}>
              {busy ? 'Creating...' : 'Create Skill'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
