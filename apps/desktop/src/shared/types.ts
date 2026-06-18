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

export interface CreateSkillOptions {
  targetDir: string;
  name: string;
  displayName: string;
  launchPhrase: string;
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

export interface JiboStudioAPI {
  openProject: () => Promise<string | null>;
  createProjectFolder: () => Promise<string | null>;
  listFiles: (rootPath: string) => Promise<FileEntry[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  watchProject: (rootPath: string, callback: (event: string, path: string) => void) => () => void;
  getVendorPath: () => Promise<string>;
  createSkill: (options: CreateSkillOptions) => Promise<ToolchainResult>;
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
