export interface SkillPackageJson {
  name: string;
  version: string;
  main: string;
  jibo: {
    main: string;
    type: string;
    launchRule: string;
    prompt: string;
    'display-name': string;
    sourceFormat?: 'dsl-v1' | 'legacy-artifacts';
    skillEntry?: string;
  };
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export interface SkillProjectInfo {
  rootPath: string;
  name: string;
  displayName: string;
  launchPhrase: string;
}

export type SkillSourceMode = 'dsl-v1' | 'legacy-artifacts';

export type EditorKind = 'flow' | 'behavior' | 'rule' | 'mim' | 'jibo' | 'monaco';

export function getEditorForFile(
  filePath: string,
  _mode: SkillSourceMode = 'legacy-artifacts',
): EditorKind {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.jibo')) return 'jibo';
  if (lower.endsWith('.flow')) return 'flow';
  if (lower.endsWith('.bt')) return 'behavior';
  if (lower.endsWith('.rule')) return 'rule';
  if (lower.endsWith('.mim')) return 'mim';
  return 'monaco';
}

export function buildLaunchRule(phrase: string, skillName: string): string {
  const escaped = phrase.replace(/'/g, "\\'");
  return `TopRule = ($* ${escaped} {%skill='${skillName}'%} $*);\n`;
}

export function isGeneratedArtifactPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  return (
    normalized === 'launch.rule' ||
    normalized.startsWith('src/flows/') ||
    normalized.startsWith('src/behaviors/') ||
    normalized.startsWith('src/rules/') ||
    normalized.startsWith('mims/') ||
    normalized.startsWith('.jibo-studio/')
  );
}

export function getSkillEntryFile(pkg?: SkillPackageJson | null): string {
  return pkg?.jibo?.skillEntry ?? 'skill.jibo';
}

/** Pure detection when package JSON and file existence are already known. */
export function detectSkillSourceModeFromHints(hints: {
  sourceFormat?: string;
  hasSkillEntry: boolean;
}): SkillSourceMode {
  if (hints.sourceFormat === 'dsl-v1') return 'dsl-v1';
  if (hints.sourceFormat === 'legacy-artifacts') return 'legacy-artifacts';
  if (hints.hasSkillEntry) return 'dsl-v1';
  return 'legacy-artifacts';
}

/**
 * True when this looks like a Jibo skill that Studio has never claimed —
 * no explicit `jibo.sourceFormat` and no `skill.jibo` yet. Opening such a
 * project should offer Keep Legacy vs Migrate to JiboScript.
 */
export function needsSourceChoiceFromHints(hints: {
  sourceFormat?: string;
  hasSkillEntry: boolean;
  looksLikeSkill: boolean;
}): boolean {
  if (!hints.looksLikeSkill) return false;
  if (hints.sourceFormat === 'dsl-v1' || hints.sourceFormat === 'legacy-artifacts') return false;
  if (hints.hasSkillEntry) return false;
  return true;
}
