import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { app, BrowserWindow } from 'electron';
import type { ToolchainEvent, ToolchainResult } from '../shared/types';
import {
  runSkillOnRobot,
  stopSkillOnRobot,
  syncSkillToRobot,
} from './robot-toolchain';
import { getNode6Bin, getNpmCacheDir, getToolchainDir, getVendorRoot } from './paths';
import { compileProjectToLegacy, getProjectModeInfo } from './skill-compiler';

let watchProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

function emit(event: ToolchainEvent): void {
  mainWindow?.webContents.send('toolchain:event', event);
}

const MISSING_BUNDLED_NODE_MSG =
  'Bundled legacy Node runtime is missing from this install. ' +
  'Reinstall Jibo Studio from a release that includes vendor/, or run `npm run vendor` when building from source.';

function resolveNodeBin(): string | null {
  const bundled = getNode6Bin();
  if (existsSync(bundled)) return bundled;
  if (app.isPackaged) return null;
  return 'node';
}

function buildEnv(cwd: string): NodeJS.ProcessEnv {
  const toolchainDir = getToolchainDir();
  const npmCache = getNpmCacheDir();
  const nodeBinDir = join(getVendorRoot(), 'node6', 'bin');
  const pathPrefix = existsSync(nodeBinDir) ? `${nodeBinDir}:${process.env.PATH}` : process.env.PATH;

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: pathPrefix,
    JIBO_STUDIO_VENDOR: getVendorRoot(),
  };

  if (existsSync(npmCache)) {
    env.npm_config_cache = npmCache;
  }

  if (existsSync(toolchainDir) && existsSync(join(toolchainDir, 'node_modules'))) {
    env.NODE_PATH = join(toolchainDir, 'node_modules');
  }

  void cwd;
  return env;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  label: string,
): Promise<ToolchainResult> {
  return new Promise((resolve) => {
    const nodeBin = resolveNodeBin();
    if (!nodeBin) {
      emit({ type: 'stderr', data: `${label}: ${MISSING_BUNDLED_NODE_MSG}\n` });
      resolve({ success: false, code: 1, output: MISSING_BUNDLED_NODE_MSG });
      return;
    }
    const isNpmScript = command === 'npm' || command === 'npx';
    const proc = spawn(isNpmScript ? command : nodeBin, isNpmScript ? args : [command, ...args], {
      cwd,
      env: buildEnv(cwd),
      shell: isNpmScript,
    });

    let output = '';
    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      emit({ type: 'stdout', data: text });
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      emit({ type: 'stderr', data: text });
    });
    proc.on('error', (err) => {
      emit({ type: 'error', data: `${label}: ${err.message}` });
      resolve({ success: false, code: 1, output: output + err.message });
    });
    proc.on('close', (code) => {
      emit({ type: 'exit', code: code ?? 1 });
      resolve({ success: (code ?? 1) === 0, code: code ?? 1, output });
    });
  });
}

function jiboDevBin(projectPath: string): string {
  const local = join(projectPath, 'node_modules', '.bin', 'jibo-dev');
  if (existsSync(local)) return local;
  const vendor = join(getVendorRoot(), 'skill-deps', 'node_modules', '.bin', 'jibo-dev');
  if (existsSync(vendor)) return vendor;
  return 'jibo-dev';
}

async function compileIfDsl(projectPath: string): Promise<ToolchainResult | null> {
  const mode = getProjectModeInfo(projectPath).mode;
  if (mode !== 'dsl-v1') return null;
  emit({ type: 'stdout', data: 'Compiling JiboScript → legacy artifacts...\n' });
  const result = compileProjectToLegacy(projectPath);
  if (result.diagnostics?.length) {
    for (const d of result.diagnostics) {
      const line = `  [${d.severity}] ${d.startLine}:${d.startColumn} ${d.message}\n`;
      emit({ type: d.severity === 'error' ? 'stderr' : 'stdout', data: line });
    }
  }
  if (!result.success) {
    emit({ type: 'stderr', data: 'JiboScript compile failed.\n' });
    emit({ type: 'exit', code: 1 });
    return result;
  }
  emit({ type: 'stdout', data: `${result.output}\n` });
  return null;
}

export async function installBundledSkillDeps(projectPath: string): Promise<ToolchainResult> {
  const { installBundledDeps } = await import('./project-manager');
  emit({ type: 'stdout', data: 'Installing bundled Jibo SDK (offline)...\n' });
  const result = installBundledDeps(projectPath);
  if (result.success) {
    emit({ type: 'stdout', data: `${result.message}\n` });
    return { success: true, code: 0, output: result.message };
  }
  emit({ type: 'stderr', data: `${result.message}\n` });
  return { success: false, code: 1, output: result.message };
}

export async function buildSkill(projectPath: string): Promise<ToolchainResult> {
  const compileFailure = await compileIfDsl(projectPath);
  if (compileFailure) return compileFailure;

  emit({ type: 'stdout', data: 'Running jibo-dev build...\n' });
  const bin = jiboDevBin(projectPath);
  if (!existsSync(bin)) {
    const msg = 'jibo-dev not found. Create the skill again or ensure vendor/skill-deps is present.';
    emit({ type: 'stderr', data: msg + '\n' });
    return { success: false, code: 1, output: msg };
  }
  return runCommand(bin, ['build'], projectPath, 'jibo-dev build');
}

export async function watchSkill(projectPath: string): Promise<{ pid: number }> {
  await stopWatch();
  const compileFailure = await compileIfDsl(projectPath);
  if (compileFailure) {
    throw new Error(compileFailure.output || 'JiboScript compile failed');
  }
  const nodeBin = resolveNodeBin();
  if (!nodeBin) {
    throw new Error(MISSING_BUNDLED_NODE_MSG);
  }
  const bin = jiboDevBin(projectPath);
  watchProcess = spawn(nodeBin, [bin, 'watch'], {
    cwd: projectPath,
    env: buildEnv(projectPath),
  });
  watchProcess.stdout?.on('data', (c) => emit({ type: 'stdout', data: c.toString() }));
  watchProcess.stderr?.on('data', (c) => emit({ type: 'stderr', data: c.toString() }));
  watchProcess.on('close', () => {
    watchProcess = null;
    emit({ type: 'exit', code: 0 });
  });
  return { pid: watchProcess.pid ?? 0 };
}

export async function stopWatch(): Promise<void> {
  if (watchProcess) {
    watchProcess.kill();
    watchProcess = null;
  }
}

async function runRobotAction(
  label: string,
  action: () => Promise<string | undefined>,
): Promise<ToolchainResult> {
  try {
    const message = await action();
    if (message) {
      emit({ type: 'stdout', data: `${message}\n` });
    }
    emit({ type: 'exit', code: 0 });
    return { success: true, code: 0, output: message ?? '' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit({ type: 'stderr', data: `${label}: ${message}\n` });
    emit({ type: 'exit', code: 1 });
    return { success: false, code: 1, output: message };
  }
}

export async function syncToRobot(projectPath: string, host: string): Promise<ToolchainResult> {
  const compileFailure = await compileIfDsl(projectPath);
  if (compileFailure) return compileFailure;
  emit({ type: 'stdout', data: `Syncing to ${host}...\n` });
  return runRobotAction('jibo sync', () => syncSkillToRobot(projectPath, host));
}

export async function runOnRobot(projectPath: string, host: string): Promise<ToolchainResult> {
  emit({ type: 'stdout', data: `Running on ${host}...\n` });
  return runRobotAction('jibo run', () => runSkillOnRobot(projectPath, host));
}

export async function stopOnRobot(host: string): Promise<ToolchainResult> {
  emit({ type: 'stdout', data: `Stopping skill on ${host}...\n` });
  return runRobotAction('jibo stop', () => stopSkillOnRobot(host));
}
