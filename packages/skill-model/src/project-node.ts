import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  detectSkillSourceModeFromHints,
  getSkillEntryFile,
  type SkillPackageJson,
  type SkillSourceMode,
} from './project';

export { getSkillEntryFile };

export function readSkillPackageJson(projectPath: string): SkillPackageJson | null {
  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8')) as SkillPackageJson;
  } catch {
    return null;
  }
}

export function detectSkillSourceMode(
  projectPath: string,
  pkg?: SkillPackageJson | null,
): SkillSourceMode {
  const packageJson = pkg === undefined ? readSkillPackageJson(projectPath) : pkg;
  const entry = getSkillEntryFile(packageJson);
  const hasSkillEntry =
    existsSync(join(projectPath, entry)) || existsSync(join(projectPath, 'skill.jibo'));
  return detectSkillSourceModeFromHints({
    sourceFormat: packageJson?.jibo?.sourceFormat,
    hasSkillEntry,
  });
}
