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

export function getEditorForFile(filePath: string): 'flow' | 'behavior' | 'rule' | 'mim' | 'monaco' {
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
