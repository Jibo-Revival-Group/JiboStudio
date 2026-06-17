import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { RobotProfile } from '../../../shared/types';
import { MaterialIcon } from './icons';
import './robot.css';

interface RobotPanelProps {
  profiles: RobotProfile[];
  activeRobot: RobotProfile | null;
  projectPath: string | null;
  onProfilesChange: (profiles: RobotProfile[]) => void;
  onActiveRobotChange: (robot: RobotProfile | null) => void;
  onTerminalOutput: (output: string) => void;
  onStatus: (msg: string) => void;
}

export function RobotPanel({
  profiles,
  activeRobot,
  projectPath,
  onProfilesChange,
  onActiveRobotChange,
  onTerminalOutput,
  onStatus,
}: RobotPanelProps) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const saveProfile = async () => {
    if (!host.trim()) return;
    const profile: RobotProfile = {
      id: uuidv4(),
      name: name.trim() || host.trim(),
      host: host.trim(),
    };
    const updated = await window.jiboStudio.saveRobotProfile(profile);
    onProfilesChange(updated);
    onActiveRobotChange(profile);
    setName('');
    setHost('');
  };

  const selectProfile = (profile: RobotProfile) => {
    onActiveRobotChange(profile);
    window.jiboStudio.saveRobotProfile(profile);
  };

  const deleteProfile = async (profile: RobotProfile) => {
    const updated = await window.jiboStudio.deleteRobotProfile(profile.id);
    onProfilesChange(updated);
    if (activeRobot?.id === profile.id) {
      onActiveRobotChange(null);
      setConnectionStatus(null);
    }
    onStatus(`Removed ${profile.name}`);
  };

  const testConnection = async () => {
    const target = activeRobot?.host ?? host;
    if (!target) return;
    setTesting(true);
    setConnectionStatus(null);
    const status = await window.jiboStudio.testRobotConnection(target);
    if (!status.reachable) {
      setConnectionStatus('Could not reach robot. Check IP/hostname and network.');
    } else if (status.devShellReady) {
      setConnectionStatus(`Ready — dev shell on :8686, SSM at ${status.ssmUrl}`);
    } else if (status.syncMethod === 'ssh') {
      setConnectionStatus(
        `SSM reachable at ${status.ssmUrl}, but dev shell (:8686) is off. ` +
          'Sync will use SSH/rsync (needs ssh-copy-id root@robot). Run/Stop use SSM.',
      );
    } else {
      setConnectionStatus(
        `Robot reachable (SSM ${status.ssmUrl}), but sync needs dev shell (:8686) or SSH. ` +
          'Enable developer mode on the robot, or set up SSH key login.',
      );
    }
    setTesting(false);
  };

  const sync = async () => {
    if (!projectPath || !activeRobot) return;
    onTerminalOutput('');
    onStatus('Syncing...');
    const result = await window.jiboStudio.robotSync(projectPath, activeRobot.host);
    onStatus(result.success ? 'Sync complete' : 'Sync failed');
  };

  const run = async () => {
    if (!projectPath || !activeRobot) return;
    onStatus('Running skill on robot...');
    const result = await window.jiboStudio.robotRun(projectPath, activeRobot.host);
    onStatus(result.success ? 'Skill running' : 'Run failed');
  };

  const stop = async () => {
    if (!activeRobot) return;
    const result = await window.jiboStudio.robotStop(activeRobot.host);
    onStatus(result.success ? 'Skill stopped' : 'Stop failed');
  };

  return (
    <div className="robot-panel">
      <h3>Robot Connection</h3>
      <p className="robot-panel__hint">Enter your Jibo IP or hostname (e.g. 192.168.1.42)</p>

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Jibo" />
      </label>
      <label>
        Host
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.42" />
      </label>
      <button type="button" className="robot-panel__btn" onClick={saveProfile}>
        Save Profile
      </button>

      {profiles.length > 0 && (
        <div className="robot-panel__list">
          <h4>Saved Robots</h4>
          {profiles.map((p) => (
            <div key={p.id} className="robot-panel__profile-row">
              <button
                type="button"
                className={`robot-panel__profile ${activeRobot?.id === p.id ? 'active' : ''}`}
                onClick={() => selectProfile(p)}
              >
                <span>{p.name}</span>
                <small>{p.host}</small>
              </button>
              <button
                type="button"
                className="robot-panel__delete"
                onClick={() => deleteProfile(p)}
                title={`Remove ${p.name}`}
                aria-label={`Remove ${p.name}`}
              >
                <MaterialIcon name="delete" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeRobot && (
        <div className="robot-panel__active">
          <strong>Active: {activeRobot.name}</strong>
          <span>{activeRobot.host}</span>
        </div>
      )}

      <div className="robot-panel__actions">
        <button type="button" onClick={testConnection} disabled={testing || (!activeRobot && !host)}>
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button type="button" onClick={sync} disabled={!projectPath || !activeRobot}>
          Sync (--dev)
        </button>
        <button type="button" onClick={run} disabled={!projectPath || !activeRobot}>
          Run
        </button>
        <button type="button" onClick={stop} disabled={!activeRobot}>
          Stop
        </button>
      </div>

      {connectionStatus && <p className="robot-panel__status">{connectionStatus}</p>}
    </div>
  );
}
