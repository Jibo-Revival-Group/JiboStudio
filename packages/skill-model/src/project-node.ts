import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  detectSkillSourceModeFromHints,
  getSkillEntryFile,
  needsSourceChoiceFromHints,
  type SkillPackageJson,
  type SkillSourceMode,
} from './project';

export { getSkillEntryFile, needsSourceChoiceFromHints };

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

export function looksLikeSkillProject(projectPath: string, pkg?: SkillPackageJson | null): boolean {
  const packageJson = pkg === undefined ? readSkillPackageJson(projectPath) : pkg;
  if (packageJson?.jibo) return true;
  if (existsSync(join(projectPath, 'launch.rule'))) return true;
  if (existsSync(join(projectPath, 'skill.jibo'))) return true;
  const flowsDir = join(projectPath, 'src', 'flows');
  if (existsSync(flowsDir)) {
    try {
      return readdirSync(flowsDir).some((name) => name.endsWith('.flow'));
    } catch {
      return false;
    }
  }
  return false;
}

export function needsSourceChoice(
  projectPath: string,
  pkg?: SkillPackageJson | null,
): boolean {
  const packageJson = pkg === undefined ? readSkillPackageJson(projectPath) : pkg;
  const entry = getSkillEntryFile(packageJson);
  const hasSkillEntry =
    existsSync(join(projectPath, entry)) || existsSync(join(projectPath, 'skill.jibo'));
  return needsSourceChoiceFromHints({
    sourceFormat: packageJson?.jibo?.sourceFormat,
    hasSkillEntry,
    looksLikeSkill: looksLikeSkillProject(projectPath, packageJson),
  });
}
