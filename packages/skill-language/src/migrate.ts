import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import {
  getBehaviorRoot,
  parseBehavior,
  parseFlow,
  parseMim,
  parseRule,
  type BehaviorDocument,
  type BehaviorNode as ModelBehaviorNode,
  type FlowDocument,
  type FlowNode,
  type MimDocument,
} from '@jibo-studio/skill-model';
import type { BehaviorNode } from './ast';
import { compileSkillProject, type CompileResult } from './compile';

export interface MigrateResult {
  success: boolean;
  entryFile: string;
  source: string;
  warnings: string[];
  compile?: CompileResult;
}

/**
 * Convert a legacy-artifacts skill into a `skill.jibo` source file, mark the
 * project as dsl-v1, and recompile so generated artifacts stay in sync.
 *
 * Best-effort: linear flows and simple behavior trees lift cleanly; branching
 * / exotic nodes become `eval`/`script` escape hatches (or skipped with a
 * warning). Rules always become `raw_rule` blocks.
 */
export function migrateLegacyProjectToDsl(
  projectPath: string,
  entryFile = 'skill.jibo',
): MigrateResult {
  const warnings: string[] = [];
  const chunks: string[] = [
    '# Migrated from legacy Flow / Behavior / MIM / Rule artifacts by Jibo Studio.',
    '# Review this file, then Save / Build. Complex legacy nodes may need hand edits.',
    '',
  ];

  const pkg = readPackageJson(projectPath);
  const launchPhrase = extractLaunchPhrase(projectPath) ?? pkg?.jibo?.prompt ?? 'hey jibo';
  const name = pkg?.name || basename(projectPath);
  const display = pkg?.jibo?.['display-name'] || name;
  const prompt = pkg?.jibo?.prompt || launchPhrase;

  chunks.push('skill:');
  chunks.push(`  name = ${quote(name)}`);
  chunks.push(`  display = ${quote(display)}`);
  chunks.push(`  launch = ${quote(launchPhrase)}`);
  chunks.push(`  prompt = ${quote(prompt)}`);
  chunks.push('');

  for (const flowName of listBasenames(join(projectPath, 'src', 'flows'), '.flow')) {
    const content = readFileSync(join(projectPath, 'src', 'flows', `${flowName}.flow`), 'utf8');
    try {
      const doc = parseFlow(content);
      chunks.push(...emitFlow(flowName, doc, warnings));
      chunks.push('');
    } catch (err) {
      warnings.push(`Could not migrate flow '${flowName}': ${String(err)}`);
    }
  }

  for (const mimName of listBasenames(join(projectPath, 'mims'), '.mim')) {
    const content = readFileSync(join(projectPath, 'mims', `${mimName}.mim`), 'utf8');
    try {
      chunks.push(...emitMim(mimName, parseMim(content), warnings));
      chunks.push('');
    } catch (err) {
      warnings.push(`Could not migrate mim '${mimName}': ${String(err)}`);
    }
  }

  for (const behaviorName of listBasenames(join(projectPath, 'src', 'behaviors'), '.bt')) {
    const content = readFileSync(
      join(projectPath, 'src', 'behaviors', `${behaviorName}.bt`),
      'utf8',
    );
    try {
      chunks.push(...emitBehavior(behaviorName, parseBehavior(content), warnings));
      chunks.push('');
    } catch (err) {
      warnings.push(`Could not migrate behavior '${behaviorName}': ${String(err)}`);
    }
  }

  for (const ruleName of listBasenames(join(projectPath, 'src', 'rules'), '.rule')) {
    const content = readFileSync(join(projectPath, 'src', 'rules', `${ruleName}.rule`), 'utf8');
    try {
      const doc = parseRule(content);
      chunks.push(...emitRawRule(ruleName, doc.content));
      chunks.push('');
    } catch (err) {
      warnings.push(`Could not migrate rule '${ruleName}': ${String(err)}`);
    }
  }

  const source = `${chunks.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
  const entryPath = join(projectPath, entryFile);
  writeFileSync(entryPath, source, 'utf8');
  writePackageAsDsl(projectPath, entryFile, { name, display, prompt });

  const compile = compileSkillProject(projectPath, entryFile);
  return {
    success: compile.success,
    entryFile,
    source,
    warnings: [
      ...warnings,
      ...compile.diagnostics
        .filter((d) => d.severity !== 'error')
        .map((d) => d.message),
    ],
    compile,
  };
}

/** Mark an untouched skill as explicitly legacy so Studio won't prompt again. */
export function claimLegacyProject(projectPath: string): void {
  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) {
    throw new Error('package.json is required to claim a legacy skill');
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
  const jibo = (pkg.jibo as Record<string, unknown>) ?? {};
  jibo.sourceFormat = 'legacy-artifacts';
  delete jibo.skillEntry;
  pkg.jibo = jibo;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  const studioDir = join(projectPath, '.jibo-studio');
  mkdirSync(studioDir, { recursive: true });
  writeFileSync(
    join(studioDir, 'source-choice.json'),
    `${JSON.stringify({ choice: 'legacy-artifacts', chosenAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
}

function writePackageAsDsl(
  projectPath: string,
  entryFile: string,
  meta: { name: string; display: string; prompt: string },
): void {
  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) return;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
    pkg.name = meta.name;
    const jibo = (pkg.jibo as Record<string, unknown>) ?? {};
    jibo['display-name'] = meta.display;
    jibo.prompt = meta.prompt;
    jibo.launchRule = 'launch.rule';
    jibo.sourceFormat = 'dsl-v1';
    jibo.skillEntry = entryFile;
    pkg.jibo = jibo;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  } catch {
    // non-fatal — compile will still write skill.jibo
  }

  const studioDir = join(projectPath, '.jibo-studio');
  mkdirSync(studioDir, { recursive: true });
  writeFileSync(
    join(studioDir, 'source-choice.json'),
    `${JSON.stringify({ choice: 'dsl-v1', chosenAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
}

function emitFlow(name: string, doc: FlowDocument, warnings: string[]): string[] {
  const lines = [`flow ${name}:`];
  const byId = new Map(doc.nodeDataArray.map((n) => [n.id, n]));
  const outs = new Map<string, string[]>();
  for (const link of doc.linkDataArray) {
    const list = outs.get(link.from) ?? [];
    list.push(link.to);
    outs.set(link.from, list);
  }

  const begin = doc.nodeDataArray.find((n) => n.class === 'Flow.Begin');
  if (!begin) {
    warnings.push(`Flow '${name}' has no Begin node — skipped`);
    return [`# skipped flow ${name} (no Begin)`];
  }

  let current: FlowNode | undefined = begin;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.class !== 'Flow.Begin') {
      const step = flowNodeToStep(current, warnings, name);
      if (step) lines.push(`  ${step}`);
      if (current.class === 'Flow.End') break;
    }
    const nextIds = outs.get(current.id) ?? [];
    if (nextIds.length > 1) {
      warnings.push(
        `Flow '${name}' has branching after '${current.name || current.class}' — only the first edge was kept`,
      );
    }
    current = nextIds[0] ? byId.get(nextIds[0]) : undefined;
  }

  if (!lines.some((l) => l.trim() === 'end')) {
    lines.push('  end');
  }
  return lines;
}

function flowNodeToStep(node: FlowNode, warnings: string[], flowName: string): string | null {
  const opts = node.options ?? {};
  switch (node.class) {
    case 'Flow.End':
      return 'end';
    case 'Flow.Subflow': {
      const raw = String(opts.subflowId ?? node.name ?? '');
      const target = raw.replace(/^\.\//, '').replace(/\.flow$/, '') || node.name || 'unknown';
      const bindings = extractObjectBindings(opts.inputParameters);
      return `call ${sanitizeIdent(target)}${formatWith(bindings)}`;
    }
    case 'Mim.Announcement':
    case 'Mim.Optional-Response':
    case 'Mim': {
      const mim = mimNameFromPath(opts.mimPath, node.name);
      const bindings = extractObjectBindings(opts.getPromptData);
      return `announce ${sanitizeIdent(mim)}${formatWith(bindings)}`;
    }
    case 'Mim.Question': {
      const mim = mimNameFromPath(opts.mimPath, node.name);
      const bindings = extractObjectBindings(opts.getPromptData);
      return `query ${sanitizeIdent(mim)}${formatWith(bindings)}`;
    }
    case 'Flow.Eval':
    case 'Flow.Eval-Async': {
      const src = scriptToString(opts.exec);
      return `eval ${quote(src || '() => {}')}`;
    }
    case 'PlayAnimation': {
      const anim = String(opts.animName ?? node.name ?? 'animation');
      return `animate ${quote(anim)}`;
    }
    case 'Subtree': {
      const path = String(opts.behaviorPath ?? '');
      const name = path.split(/[/\\]/).pop()?.replace(/\.bt$/, '') || node.name || 'behavior';
      return `run ${sanitizeIdent(name)}`;
    }
    default: {
      warnings.push(
        `Flow '${flowName}': unsupported node '${node.class}' (${node.name || node.id}) became an eval stub`,
      );
      return `eval ${quote(`/* unsupported legacy node: ${node.class} */`)}`;
    }
  }
}

function emitMim(name: string, doc: MimDocument, warnings: string[]): string[] {
  const lines = [`mim ${name}:`];
  const type =
    doc.mim_type === 'query' || doc.mim_type === 'confirm' || doc.mim_type === 'announcement'
      ? doc.mim_type
      : 'announcement';
  if (doc.mim_type && doc.mim_type !== type) {
    warnings.push(`Mim '${name}': unknown type '${doc.mim_type}', using announcement`);
  }
  lines.push(`  type = ${type}`);
  if (doc.rule_name && doc.rule_name !== 'N/A') {
    const rule = basename(doc.rule_name).replace(/\.rule$/i, '').replace(/\.fst$/i, '');
    if (rule) lines.push(`  rule = ${sanitizeIdent(rule)}`);
  }
  for (const prompt of doc.prompts ?? []) {
    if (!prompt.prompt?.trim()) continue;
    let line = `  say ${quote(prompt.prompt)}`;
    if (prompt.prompt_category) line += ` category = ${quote(prompt.prompt_category)}`;
    if (prompt.prompt_sub_category) line += ` sub = ${quote(prompt.prompt_sub_category)}`;
    lines.push(line);
  }
  if ((doc.prompts ?? []).every((p) => !p.prompt?.trim())) {
    lines.push(`  say ${quote('(migrated empty prompt)')}`);
    warnings.push(`Mim '${name}' had no prompt text`);
  }
  return lines;
}

function emitBehavior(name: string, doc: BehaviorDocument, warnings: string[]): string[] {
  const root = getBehaviorRoot(doc);
  if (!root) {
    warnings.push(`Behavior '${name}' has no root — skipped`);
    return [`# skipped behavior ${name} (no root)`];
  }
  const ast = liftBehaviorNode(root, doc, warnings, name);
  return [`behavior ${name}:`, ...renderBehaviorNode(ast, 1)];
}

function liftBehaviorNode(
  node: ModelBehaviorNode,
  doc: BehaviorDocument,
  warnings: string[],
  behaviorName: string,
): BehaviorNode {
  const span = { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };
  if (node.class === 'Sequence' || node.class === 'Switch') {
    const children = (node.children ?? []).map((childId) => {
      const child = doc[String(childId)] as ModelBehaviorNode | undefined;
      if (!child || !('class' in child)) {
        return { kind: 'script' as const, source: '() => {}', span };
      }
      return liftBehaviorNode(child, doc, warnings, behaviorName);
    });
    return {
      kind: node.class === 'Sequence' ? 'sequence' : 'selector',
      children,
      span,
    };
  }
  if (node.class === 'PlayAudio') {
    return {
      kind: 'play_audio',
      path: String(node.options?.audioPath ?? ''),
      span,
    };
  }
  if (node.class === 'ExecuteScript') {
    return {
      kind: 'script',
      source: scriptToString(node.options?.exec) || '() => {}',
      span,
    };
  }
  warnings.push(
    `Behavior '${behaviorName}': unsupported node '${node.class}' became a script stub`,
  );
  return {
    kind: 'script',
    source: `/* unsupported legacy behavior node: ${node.class} */`,
    span,
  };
}

function renderBehaviorNode(node: BehaviorNode, indent: number): string[] {
  const pad = '  '.repeat(indent);
  if (node.kind === 'sequence' || node.kind === 'selector') {
    const lines = [`${pad}${node.kind}:`];
    for (const child of node.children) {
      lines.push(...renderBehaviorNode(child, indent + 1));
    }
    if (node.children.length === 0) {
      lines.push(`${pad}  script ${quote('() => {}')}`);
    }
    return lines;
  }
  if (node.kind === 'play_audio') {
    return [`${pad}play_audio ${quote(node.path)}`];
  }
  return [`${pad}script ${quote(node.source)}`];
}

function emitRawRule(name: string, content: string): string[] {
  const body = content.replace(/\r\n/g, '\n').replace(/^\n+/, '').replace(/\n+$/, '');
  return [`raw_rule ${name}: """`, body, '"""'];
}

function extractLaunchPhrase(projectPath: string): string | null {
  const launchPath = join(projectPath, 'launch.rule');
  if (!existsSync(launchPath)) return null;
  const text = readFileSync(launchPath, 'utf8');
  const match = text.match(/\$\*\s+(.+?)\s+\{\%skill=/);
  return match?.[1]?.trim() || null;
}

function extractObjectBindings(script: unknown): Record<string, string> {
  const text = scriptToString(script);
  const match = text.match(/return\s*\{([\s\S]*?)\}/);
  if (!match) return {};
  const out: Record<string, string> = {};
  for (const part of match[1]!.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const kv = trimmed.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
    if (kv) out[kv[1]!] = kv[2]!.trim().replace(/;$/, '');
  }
  return out;
}

function formatWith(bindings: Record<string, string>): string {
  const entries = Object.entries(bindings);
  if (!entries.length) return '';
  return ` with ${entries.map(([k, v]) => `${k} = ${v}`).join(', ')}`;
}

function mimNameFromPath(mimPath: unknown, fallback?: string): string {
  const raw = String(mimPath ?? fallback ?? 'mim');
  return basename(raw).replace(/\.mim$/i, '') || fallback || 'mim';
}

function scriptToString(value: unknown): string {
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'string') return value;
  return '';
}

function listBasenames(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(ext))
      .map((name) => name.slice(0, -ext.length))
      .sort();
  } catch {
    return [];
  }
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function sanitizeIdent(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

function readPackageJson(projectPath: string): {
  name?: string;
  jibo?: {
    prompt?: string;
    'display-name'?: string;
  };
} | null {
  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      name?: string;
      jibo?: { prompt?: string; 'display-name'?: string };
    };
  } catch {
    return null;
  }
}
