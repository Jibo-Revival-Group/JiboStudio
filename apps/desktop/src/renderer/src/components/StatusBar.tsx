import type { RobotProfile } from '../../../shared/types';

interface StatusBarProps {
  message: string;
  projectPath: string | null;
  robot: RobotProfile | null;
  dirty?: boolean;
}

export function StatusBar({ message, projectPath, robot, dirty }: StatusBarProps) {
  return (
    <>
      <span>{message}</span>
      {dirty && <span>Unsaved changes</span>}
      {projectPath && <span>{projectPath.split('/').pop()}</span>}
      {robot && <span>Robot: {robot.host}</span>}
    </>
  );
}
