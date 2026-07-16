import {
  claimLegacyProject,
  compileSkillProject,
  compileSkillSource,
  migrateLegacyProjectToDsl,
  type CompileResult,
} from '@jibo-studio/skill-language';
import {
  detectSkillSourceMode,
  getSkillEntryFile,
  needsSourceChoice,
  readSkillPackageJson,
} from '@jibo-studio/skill-model-node';
import { join } from 'path';
import type {
  CompileSkillResult,
  MigrateSkillResult,
  ProjectModeInfo,
  SourceDiagnostic,
  ToolchainResult,
} from '../shared/types';

export function getProjectModeInfo(projectPath: string): ProjectModeInfo {
  const pkg = readSkillPackageJson(projectPath);
  const mode = detectSkillSourceMode(projectPath, pkg);
  const entry = mode === 'dsl-v1' ? getSkillEntryFile(pkg) : null;
  return {
    mode,
    entryFile: entry,
    displayName: pkg?.jibo?.['display-name'] ?? pkg?.name ?? null,
    needsSourceChoice: needsSourceChoice(projectPath, pkg),
  };
}

export function compileProjectToLegacy(projectPath: string): CompileSkillResult {
  const pkg = readSkillPackageJson(projectPath);
  const entry = getSkillEntryFile(pkg);
  const result = compileSkillProject(projectPath, entry);
  return toCompileResult(result);
}

export function validateSkillFile(
  projectPath: string,
  filePath: string,
  content: string,
): SourceDiagnostic[] {
  const relative = filePath.startsWith(projectPath)
    ? filePath.slice(projectPath.length).replace(/^[\\/]/, '')
    : filePath;
  const result = compileSkillSource(content, relative || 'skill.jibo');
  return result.diagnostics.map(toSourceDiagnostic);
}

export function keepProjectLegacy(projectPath: string): ToolchainResult {
  try {
    claimLegacyProject(projectPath);
    return { success: true, code: 0, output: 'Kept legacy source format.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, code: 1, output: message };
  }
}

export function migrateProjectToDsl(projectPath: string): MigrateSkillResult {
  try {
    const result = migrateLegacyProjectToDsl(projectPath);
    const compile = result.compile;
    const errors = compile?.diagnostics.filter((d) => d.severity === 'error') ?? [];
    const outputLines = [
      `Wrote ${result.entryFile}`,
      ...result.warnings.map((w) => `warning: ${w}`),
      ...(compile
        ? [
            compile.success
              ? `Compiled ${compile.artifacts.length} legacy artifact(s).`
              : errors.map((d) => `line ${d.span.startLine}: ${d.message}`).join('\n'),
          ]
        : []),
    ];
    return {
      success: result.success,
      code: result.success ? 0 : 1,
      output: outputLines.filter(Boolean).join('\n'),
      entryFile: result.entryFile,
      warnings: result.warnings,
      diagnostics: compile?.diagnostics.map(toSourceDiagnostic),
      artifacts: compile?.artifacts.map((a) => a.path),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, code: 1, output: message, entryFile: 'skill.jibo', warnings: [] };
  }
}

function toCompileResult(result: CompileResult): CompileSkillResult {
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  const output = errors.length
    ? errors.map((d) => `line ${d.span.startLine}: ${d.message}`).join('\n')
    : `Compiled ${result.artifacts.length} legacy artifact(s).`;
  return {
    success: result.success,
    code: result.success ? 0 : 1,
    output,
    diagnostics: result.diagnostics.map(toSourceDiagnostic),
    artifacts: result.artifacts.map((a) => a.path),
  };
}

function toSourceDiagnostic(d: CompileResult['diagnostics'][number]): SourceDiagnostic {
  return {
    message: d.message,
    severity: d.severity,
    startLine: d.span.startLine,
    startColumn: d.span.startColumn,
    endLine: d.span.endLine,
    endColumn: d.span.endColumn,
    code: d.code,
  };
}

export function resolveSkillEntryPath(projectPath: string): string {
  const pkg = readSkillPackageJson(projectPath);
  return join(projectPath, getSkillEntryFile(pkg));
}
