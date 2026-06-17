import { spawn } from 'child_process';
import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
import http from 'http';
import { join } from 'path';
import { getToolchainDir } from './paths';
import {
  DEFAULT_SKILL_DEST,
  DEFAULT_SSH_USER,
  DEV_SHELL_PORT,
  SYNC_PORT,
  SSM_PORT,
  isPortOpen,
  normalizeHost,
} from './robot-ports';

const require = createRequire(import.meta.url);

const DEV_SHELL_HELP =
  'Dev shell (port 8686) is not running. Put the robot in developer mode and restart SSM, ' +
  'or set up passwordless SSH (ssh-copy-id root@<robot-ip>) so Jibo Studio can rsync skills.';

function readSkillName(projectPath: string): string {
  const pkgPath = join(projectPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string };
  if (!pkg.name) {
    throw new Error(`Skill package.json must define "name": ${pkgPath}`);
  }
  return pkg.name;
}

function formatConnectionError(err: unknown, host: string, port: number, label: string): Error {
  const base = err instanceof Error ? err : new Error(String(err));
  if (base.message.includes('ECONNREFUSED')) {
    return new Error(`${label} at ${normalizeHost(host)}:${port} refused the connection. ${DEV_SHELL_HELP}`);
  }
  return base;
}

function devShellRequest(
  host: string,
  urlPath: string,
  data?: Record<string, unknown>,
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data ?? {});
    const req = http.request(
      {
        hostname: normalizeHost(host),
        port: DEV_SHELL_PORT,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120_000,
      },
      (res) => {
        let response = '';
        res.on('data', (chunk) => {
          response += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(response) as { Status?: string; Message?: string };
            if (parsed.Status === 'ERROR') {
              reject(new Error(parsed.Message || 'Robot dev shell returned an error'));
              return;
            }
            resolve(parsed.Message);
          } catch {
            reject(new Error(`Invalid dev shell response: ${response}`));
          }
        });
      },
    );
    req.on('error', (err) => reject(formatConnectionError(err, host, DEV_SHELL_PORT, 'Dev shell')));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timed out contacting dev shell at ${normalizeHost(host)}:${DEV_SHELL_PORT}`));
    });
    req.write(body);
    req.end();
  });
}

function ssmRequest<T>(
  host: string,
  method: 'GET' | 'POST',
  urlPath: string,
  body?: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: normalizeHost(host),
        port: SSM_PORT,
        path: urlPath,
        method,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : undefined,
        timeout: 120_000,
      },
      (res) => {
        let response = '';
        res.on('data', (chunk) => {
          response += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(response) as T & { Status?: string; Message?: string; error?: string };
            if (parsed.Status === 'ERROR') {
              reject(new Error(parsed.Message || 'SSM returned an error'));
              return;
            }
            if (parsed.error) {
              reject(new Error(parsed.error));
              return;
            }
            resolve(parsed);
          } catch {
            reject(new Error(`Invalid SSM response: ${response}`));
          }
        });
      },
    );
    req.on('error', (err) => reject(formatConnectionError(err, host, SSM_PORT, 'SSM')));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timed out contacting SSM at ${normalizeHost(host)}:${SSM_PORT}`));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function runProcess(command: string, args: string[], timeoutMs = 300_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: false });
    let output = '';
    proc.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`${command} timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if ((code ?? 1) === 0) {
        resolve(output.trim());
        return;
      }
      reject(new Error(output.trim() || `${command} exited with code ${code ?? 1}`));
    });
  });
}

function getJiboSyncModule(): {
  uploadToServer: (
    url: string,
    dir: string,
    close: boolean,
    verbose: boolean,
    cb: (err: Error | string | null, msg?: string) => void,
  ) => void;
} {
  const syncPath = join(getToolchainDir(), 'node_modules', 'jibo-sync');
  if (!existsSync(syncPath)) {
    throw new Error(
      'Bundled jibo-sync is missing. Run `npm run vendor` from the Jibo Studio repo (maintainer setup).',
    );
  }
  const mod = require(syncPath);
  return mod.default ?? mod;
}

export function assertRobotToolchain(): void {
  const syncPath = join(getToolchainDir(), 'node_modules', 'jibo-sync');
  if (!existsSync(syncPath)) {
    throw new Error(
      'Robot sync tools are not bundled. Run `npm run vendor` from the Jibo Studio repo (maintainer setup).',
    );
  }
}

async function syncViaDevShell(projectPath: string, host: string, skillName: string): Promise<string> {
  const ip = normalizeHost(host);
  await devShellRequest(ip, '/sync-skill', { dirName: skillName });

  const jiboSync = getJiboSyncModule();
  await new Promise<void>((resolve, reject) => {
    jiboSync.uploadToServer(`${ip}:${SYNC_PORT}`, projectPath, false, true, (err) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      resolve();
    });
  });

  return `Synced "${skillName}" to ${ip} (dev shell)`;
}

async function syncViaSsh(projectPath: string, host: string, skillName: string): Promise<string> {
  const ip = normalizeHost(host);
  const sshTarget = `${DEFAULT_SSH_USER}@${ip}`;
  const remoteDest = `${DEFAULT_SKILL_DEST}/${skillName}/`;
  const sshBase = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new'];

  await runProcess('ssh', [...sshBase, sshTarget, `mkdir -p "${remoteDest}"`]);
  await runProcess('rsync', [
    '-a',
    '--delete',
    '--no-compress',
    '--exclude',
    'node_modules',
    '--exclude',
    '.git',
    '-e',
    `ssh ${sshBase.join(' ')}`,
    `${projectPath}/`,
    `${sshTarget}:${remoteDest}`,
  ]);

  return `Synced "${skillName}" to ${remoteDest} via SSH`;
}

export async function syncSkillToRobot(projectPath: string, host: string): Promise<string | undefined> {
  assertRobotToolchain();
  const skillName = readSkillName(projectPath);
  const ip = normalizeHost(host);

  const [devShellReady, sshReady] = await Promise.all([
    isPortOpen(ip, DEV_SHELL_PORT),
    isPortOpen(ip, 22),
  ]);

  if (devShellReady) {
    return syncViaDevShell(projectPath, host, skillName);
  }
  if (sshReady) {
    try {
      return await syncViaSsh(projectPath, host, skillName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Permission denied') || message.includes('publickey')) {
        throw new Error(
          `SSH authentication failed for ${DEFAULT_SSH_USER}@${ip}. ` +
            'Set up key-based login: ssh-copy-id root@' +
            ip +
            '. ' +
            DEV_SHELL_HELP,
        );
      }
      throw err;
    }
  }

  throw new Error(DEV_SHELL_HELP);
}

export async function runSkillOnRobot(projectPath: string, host: string): Promise<string | undefined> {
  const skillName = readSkillName(projectPath);
  const ip = normalizeHost(host);

  if (await isPortOpen(ip, DEV_SHELL_PORT)) {
    return devShellRequest(ip, '/run', { dirName: skillName });
  }

  const result = await ssmRequest<{ Status?: string; Message?: string }>(ip, 'POST', '/launch-dev', {
    command: skillName,
  });
  return result.Message ?? `Launched "${skillName}" via SSM`;
}

export async function stopSkillOnRobot(host: string): Promise<string | undefined> {
  const ip = normalizeHost(host);

  if (await isPortOpen(ip, DEV_SHELL_PORT)) {
    return devShellRequest(ip, '/stop');
  }

  const list = await ssmRequest<{
    skills: Array<{ name: string; running: boolean }>;
  }>(ip, 'GET', '/skill/list');

  const running = list.skills.filter((skill) => skill.running);
  if (running.length === 0) {
    return 'No skill is running on the robot';
  }

  for (const skill of running) {
    await ssmRequest(ip, 'POST', '/terminate', { command: skill.name });
  }

  const names = running.map((skill) => skill.name).join(', ');
  return `Stopped: ${names}`;
}
