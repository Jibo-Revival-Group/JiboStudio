export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileEntry[];
}

export interface RobotProfile {
  id: string;
  name: string;
  host: string;
  lastConnected?: string;
}

export interface ToolchainEvent {
  type: 'stdout' | 'stderr' | 'exit' | 'error';
  data?: string;
  code?: number;
}

export interface ToolchainResult {
  success: boolean;
  code: number;
  output: string;
}

export type SkillTemplateKind = 'dsl' | 'legacy';

export interface CreateSkillOptions {
  targetDir: string;
  name: string;
  displayName: string;
  launchPhrase: string;
  template?: SkillTemplateKind;
}

export interface RobotConnectionStatus {
  reachable: boolean;
  devShellReady?: boolean;
  ssmReady?: boolean;
  sshAvailable?: boolean;
  syncMethod?: 'dev-shell' | 'ssh' | 'none';
  devmode?: boolean;
  platformVersion?: string;
  debuggerUrl?: string;
  ssmUrl?: string;
}

export type ThemeMode = 'dark' | 'deep-dark' | 'light';

export interface AppSettings {
  version: 1;
  theme: ThemeMode;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: 1,
  theme: 'dark',
};

export type SkillSourceMode = 'dsl-v1' | 'legacy-artifacts';

export interface ProjectModeInfo {
  mode: SkillSourceMode;
  entryFile: string | null;
  displayName: string | null;
  /** True when Studio has never recorded a source-format choice for this skill. */
  needsSourceChoice: boolean;
}

export interface SourceDiagnostic {
  message: string;
  severity: 'error' | 'warning' | 'info';
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  code?: string;
}

export interface CompileSkillResult extends ToolchainResult {
  diagnostics?: SourceDiagnostic[];
  artifacts?: string[];
}

export interface MigrateSkillResult extends CompileSkillResult {
  entryFile: string;
  warnings: string[];
}

export interface JiboStudioAPI {
  openProject: () => Promise<string | null>;
  createProjectFolder: () => Promise<string | null>;
  listFiles: (rootPath: string) => Promise<FileEntry[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  watchProject: (rootPath: string, callback: (event: string, path: string) => void) => () => void;
  getVendorPath: () => Promise<string>;
  getProjectMode: (projectPath: string) => Promise<ProjectModeInfo>;
  createSkill: (options: CreateSkillOptions) => Promise<ToolchainResult>;
  compileSkill: (projectPath: string) => Promise<CompileSkillResult>;
  validateSkillSource: (projectPath: string, filePath: string, content: string) => Promise<SourceDiagnostic[]>;
  keepProjectLegacy: (projectPath: string) => Promise<ToolchainResult>;
  migrateProjectToDsl: (projectPath: string) => Promise<MigrateSkillResult>;
  toolchainBuild: (projectPath: string) => Promise<ToolchainResult>;
  toolchainWatch: (projectPath: string) => Promise<{ pid: number }>;
  toolchainStopWatch: () => Promise<void>;
  onToolchainEvent: (callback: (event: ToolchainEvent) => void) => () => void;
  getRobotProfiles: () => Promise<RobotProfile[]>;
  saveRobotProfile: (profile: RobotProfile) => Promise<RobotProfile[]>;
  deleteRobotProfile: (id: string) => Promise<RobotProfile[]>;
  testRobotConnection: (host: string) => Promise<RobotConnectionStatus>;
  robotSync: (projectPath: string, host: string) => Promise<ToolchainResult>;
  robotRun: (projectPath: string, host: string) => Promise<ToolchainResult>;
  robotStop: (host: string) => Promise<ToolchainResult>;
  getDebuggerUrl: (host: string) => string;
  getAppVersion: () => Promise<string>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
}

declare global {
  interface Window {
    jiboStudio: JiboStudioAPI;
  }
}

export {};
