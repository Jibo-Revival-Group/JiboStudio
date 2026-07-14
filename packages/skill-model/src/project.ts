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
  if (filePath.endsWith('.jibo')) return 'jibo';
  if (filePath.endsWith('.flow')) return 'flow';
  if (filePath.endsWith('.bt')) return 'behavior';
  if (filePath.endsWith('.rule')) return 'rule';
  if (filePath.endsWith('.mim')) return 'mim';
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
