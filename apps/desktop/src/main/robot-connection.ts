import http from 'http';
import {
  DEBUGGER_PORT,
  DEV_SHELL_PORT,
  SSH_PORT,
  SSM_PORT,
  isPortOpen,
  normalizeHost,
} from './robot-ports';
import type { RobotConnectionStatus } from '../shared/types';

export async function testRobotConnection(host: string): Promise<RobotConnectionStatus> {
  const normalized = normalizeHost(host);
  const debuggerUrl = `http://${normalized}:${DEBUGGER_PORT}`;
  const ssmUrl = `http://${normalized}:${SSM_PORT}`;

  const [devShellReady, ssmReady, sshAvailable, debuggerUp, ssmHttpUp] = await Promise.all([
    isPortOpen(normalized, DEV_SHELL_PORT),
    isPortOpen(normalized, SSM_PORT),
    isPortOpen(normalized, SSH_PORT),
    probeUrl(debuggerUrl),
    probeUrl(ssmUrl),
  ]);

  const reachable = debuggerUp || ssmHttpUp || devShellReady || sshAvailable;
  let syncMethod: RobotConnectionStatus['syncMethod'] = 'none';
  if (devShellReady) syncMethod = 'dev-shell';
  else if (sshAvailable) syncMethod = 'ssh';

  return {
    reachable,
    devShellReady,
    ssmReady,
    sshAvailable,
    syncMethod,
    devmode: devShellReady || (reachable && syncMethod !== 'none'),
    debuggerUrl,
    ssmUrl,
    platformVersion: ssmHttpUp ? 'detected' : undefined,
  };
}

function probeUrl(url: string, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}
