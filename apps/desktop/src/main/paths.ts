import { app } from 'electron';
import { join } from 'path';

export function getConfigDir(): string {
  return join(app.getPath('home'), '.config', 'jibo-studio');
}

export function getVendorRoot(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'vendor');
  }
  return join(app.getAppPath(), '..', '..', 'vendor');
}

export function getTemplatesDir(): string {
  return join(getVendorRoot(), 'templates', 'starter-skill');
}

export function getToolchainDir(): string {
  return join(getVendorRoot(), 'sdk-toolchain');
}

export function getNode6Bin(): string {
  return join(getVendorRoot(), 'node6', 'bin', 'node');
}

export function getNpmCacheDir(): string {
  return join(getVendorRoot(), 'npm-cache');
}

export function getSkillDepsDir(): string {
  return join(getVendorRoot(), 'skill-deps');
}

export function getBundledNodeModulesDir(): string {
  return join(getSkillDepsDir(), 'node_modules');
}
