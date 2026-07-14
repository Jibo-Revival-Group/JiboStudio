import type { RobotProfile } from '../../../shared/types';
import './status-bar.css';

interface StatusBarProps {
  message: string;
  projectPath: string | null;
  robot: RobotProfile | null;
  dirty?: boolean;
  mode?: string | null;
  watching?: boolean;
}

export function StatusBar({ message, projectPath, robot, dirty, mode, watching }: StatusBarProps) {
  return (
    <div className="status-bar">
      <span className="status-bar__segment status-bar__segment--primary">{message}</span>
      {dirty ? (
        <span className="status-bar__segment status-bar__segment--warning">Unsaved changes</span>
      ) : null}
      {watching ? <span className="status-bar__segment">Watching</span> : null}
      {mode ? <span className="status-bar__segment">{mode}</span> : null}
      {projectPath ? (
        <span className="status-bar__segment">{projectPath.split('/').pop()}</span>
      ) : null}
      {robot ? <span className="status-bar__segment">Robot: {robot.host}</span> : null}
    </div>
  );
}
