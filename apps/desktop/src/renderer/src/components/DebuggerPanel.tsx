import { useState } from 'react';
import './debugger.css';

interface DebuggerPanelProps {
  host: string | null;
}

export function DebuggerPanel({ host }: DebuggerPanelProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const debuggerUrl = host ? window.jiboStudio.getDebuggerUrl(host) : null;

  return (
    <div className="debugger-panel">
      <h3>Skill Debugger</h3>
      {!host ? (
        <p className="debugger-panel__hint">
          Connect a robot in the Robot panel first. The skill debugger runs on port 9191.
        </p>
      ) : (
        <>
          <p className="debugger-panel__url">{debuggerUrl}</p>
          <div className="debugger-panel__frame-wrap">
            {!loaded && !error && <div className="debugger-panel__loading">Loading debugger...</div>}
            {error && (
              <div className="debugger-panel__error">
                Could not load debugger. Ensure a skill is running and port 9191 is reachable.
              </div>
            )}
            <iframe
              title="Jibo Skill Debugger"
              src={debuggerUrl ?? undefined}
              className="debugger-panel__frame"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
          </div>
          <button
            type="button"
            className="debugger-panel__open"
            onClick={() => debuggerUrl && window.open(debuggerUrl, '_blank')}
          >
            Open in Browser
          </button>
        </>
      )}
    </div>
  );
}
