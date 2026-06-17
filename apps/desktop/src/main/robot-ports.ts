import net from 'net';

export const DEV_SHELL_PORT = 8686;
export const SYNC_PORT = 8989;
export const SSM_PORT = 8779;
export const DEBUGGER_PORT = 9191;
export const SSH_PORT = 22;
export const DEFAULT_SKILL_DEST = '/opt/jibo/Jibo/Skills';
export const DEFAULT_SSH_USER = 'root';

export function normalizeHost(host: string): string {
  return host.replace(/^https?:\/\//, '').replace(/\/$/, '').split(':')[0];
}

export function isPortOpen(host: string, port: number, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({
      host: normalizeHost(host),
      port,
      timeout: timeoutMs,
    });
    const finish = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.on('connect', () => finish(true));
    socket.on('error', () => finish(false));
    socket.on('timeout', () => finish(false));
  });
}
