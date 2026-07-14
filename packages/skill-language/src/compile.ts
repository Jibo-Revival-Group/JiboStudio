import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  buildLaunchRule,
  serializeBehavior,
  serializeFlow,
  serializeMim,
  serializeRule,
} from '@jibo-studio/skill-model';
import type { Diagnostic } from './diagnostics';
import { parseSkillSource } from './parser';
import { resolveModule } from './resolve';
import { lowerFlow } from './lower/flow';
import { lowerMim } from './lower/mim';
import { lowerBehavior } from './lower/behavior';
import { lowerRule } from './lower/rule';

export interface CompileArtifact {
  path: string;
  content: string;
  symbol: string;
}

export interface CompileResult {
  success: boolean;
  diagnostics: Diagnostic[];
  artifacts: CompileArtifact[];
  manifest: CompileManifest;
}

export interface CompileManifest {
  sourceFormat: 'dsl-v1';
  entry: string;
  compiledAt: string;
  artifacts: Record<string, { symbol: string; sourceHash: string }>;
}

export function compileSkillSource(source: string, file = 'skill.jibo'): CompileResult {
  const parsed = parseSkillSource(source, file);
  const resolveDiags = resolveModule(parsed.module);
  const diagnostics = [...parsed.diagnostics, ...resolveDiags];
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const artifacts: CompileArtifact[] = [];
  const manifestArtifacts: CompileManifest['artifacts'] = {};
  const sourceHash = simpleHash(source);

  if (errors.length) {
    return {
      success: false,
      diagnostics,
      artifacts: [],
      manifest: {
        sourceFormat: 'dsl-v1',
        entry: file,
        compiledAt: new Date().toISOString(),
        artifacts: {},
      },
    };
  }

  const module = parsed.module;
  if (module.skill) {
    const launch = buildLaunchRule(module.skill.launch, module.skill.name);
    artifacts.push({ path: 'launch.rule', content: launch, symbol: '@skill' });
    manifestArtifacts['launch.rule'] = { symbol: '@skill', sourceHash };
  }

  for (const flow of module.flows) {
    const doc = lowerFlow(flow, file);
    const path = `src/flows/${flow.name}.flow`;
    artifacts.push({ path, content: `${serializeFlow(doc)}\n`, symbol: flow.name });
    manifestArtifacts[path] = { symbol: flow.name, sourceHash };
  }

  for (const mim of module.mims) {
    const doc = lowerMim(mim);
    const path = `mims/${mim.name}.mim`;
    artifacts.push({ path, content: `${serializeMim(doc)}\n`, symbol: mim.name });
    manifestArtifacts[path] = { symbol: mim.name, sourceHash };
  }

  for (const behavior of module.behaviors) {
    const doc = lowerBehavior(behavior, file);
    const path = `src/behaviors/${behavior.name}.bt`;
    artifacts.push({ path, content: `${serializeBehavior(doc)}\n`, symbol: behavior.name });
    manifestArtifacts[path] = { symbol: behavior.name, sourceHash };
  }

  for (const rule of module.rules) {
    const doc = lowerRule(rule);
    const path = `src/rules/${rule.name}.rule`;
    artifacts.push({ path, content: serializeRule(doc), symbol: rule.name });
    manifestArtifacts[path] = { symbol: rule.name, sourceHash };
  }

  const manifest: CompileManifest = {
    sourceFormat: 'dsl-v1',
    entry: file,
    compiledAt: new Date().toISOString(),
    artifacts: manifestArtifacts,
  };

  return { success: true, diagnostics, artifacts, manifest };
}

export function compileSkillProject(projectPath: string, entryFile = 'skill.jibo'): CompileResult {
  const entryPath = join(projectPath, entryFile);
  if (!existsSync(entryPath)) {
    return {
      success: false,
      diagnostics: [
        {
          severity: 'error',
          message: `Missing ${entryFile}`,
          span: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 },
          code: 'project',
        },
      ],
      artifacts: [],
      manifest: {
        sourceFormat: 'dsl-v1',
        entry: entryFile,
        compiledAt: new Date().toISOString(),
        artifacts: {},
      },
    };
  }

  const source = readFileSync(entryPath, 'utf8');
  const result = compileSkillSource(source, entryFile);
  if (!result.success) return result;

  const studioDir = join(projectPath, '.jibo-studio');
  const manifestPath = join(studioDir, 'manifest.json');
  const previousManifest = readPreviousManifest(manifestPath);

  for (const artifact of result.artifacts) {
    const abs = join(projectPath, artifact.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, artifact.content, 'utf8');
  }

  // Remove artifacts from a prior compile that are no longer produced (e.g. a
  // flow/mim/behavior/rule was renamed or deleted in skill.jibo) so stale
  // generated files don't linger and get picked up by jibo-dev build.
  if (previousManifest) {
    for (const path of Object.keys(previousManifest.artifacts)) {
      if (!(path in result.manifest.artifacts)) {
        const abs = join(projectPath, path);
        try {
          rmSync(abs, { force: true });
        } catch {
          // non-fatal
        }
      }
    }
  }

  mkdirSync(studioDir, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8');

  // Refresh package.json metadata from skill block when present.
  const pkgPath = join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const parsed = parseSkillSource(source, entryFile);
      if (parsed.module.skill) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
        pkg.name = parsed.module.skill.name;
        const jibo = (pkg.jibo as Record<string, unknown>) ?? {};
        jibo['display-name'] = parsed.module.skill.display;
        jibo.prompt = parsed.module.skill.prompt;
        jibo.launchRule = 'launch.rule';
        jibo.sourceFormat = 'dsl-v1';
        jibo.skillEntry = entryFile;
        pkg.jibo = jibo;
        writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
      }
    } catch {
      // non-fatal
    }
  }

  return result;
}

function readPreviousManifest(manifestPath: string): CompileManifest | null {
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8')) as CompileManifest;
  } catch {
    return null;
  }
}

function simpleHash(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
