import { contextBridge, ipcRenderer } from 'electron';
import type { JiboStudioAPI, ToolchainEvent } from '../shared/types';

const api: JiboStudioAPI = {
  openProject: () => ipcRenderer.invoke('project:open'),
  createProjectFolder: () => ipcRenderer.invoke('project:createFolder'),
  listFiles: (rootPath) => ipcRenderer.invoke('project:listFiles', rootPath),
  readFile: (filePath) => ipcRenderer.invoke('project:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('project:writeFile', filePath, content),
  watchProject: (rootPath, callback) => {
    ipcRenderer.invoke('project:watch', rootPath);
    const handler = (_: unknown, event: string, path: string) => callback(event, path);
    ipcRenderer.on('project:changed', handler);
    return () => ipcRenderer.removeListener('project:changed', handler);
  },
  getVendorPath: () => ipcRenderer.invoke('vendor:getPath'),
  getProjectMode: (projectPath) => ipcRenderer.invoke('project:getMode', projectPath),
  createSkill: (options) => ipcRenderer.invoke('skill:create', options),
  compileSkill: (projectPath) => ipcRenderer.invoke('skill:compile', projectPath),
  validateSkillSource: (projectPath, filePath, content) =>
    ipcRenderer.invoke('skill:validate', projectPath, filePath, content),
  toolchainBuild: (projectPath) => ipcRenderer.invoke('toolchain:build', projectPath),
  toolchainWatch: (projectPath) => ipcRenderer.invoke('toolchain:watch', projectPath),
  toolchainStopWatch: () => ipcRenderer.invoke('toolchain:stopWatch'),
  onToolchainEvent: (callback) => {
    const handler = (_: unknown, event: ToolchainEvent) => callback(event);
    ipcRenderer.on('toolchain:event', handler);
    return () => ipcRenderer.removeListener('toolchain:event', handler);
  },
  getRobotProfiles: () => ipcRenderer.invoke('robot:getProfiles'),
  saveRobotProfile: (profile) => ipcRenderer.invoke('robot:saveProfile', profile),
  deleteRobotProfile: (id) => ipcRenderer.invoke('robot:deleteProfile', id),
  testRobotConnection: (host) => ipcRenderer.invoke('robot:testConnection', host),
  robotSync: (projectPath, host) => ipcRenderer.invoke('robot:sync', projectPath, host),
  robotRun: (projectPath, host) => ipcRenderer.invoke('robot:run', projectPath, host),
  robotStop: (host) => ipcRenderer.invoke('robot:stop', host),
  getDebuggerUrl: (host) => {
    const normalized = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `http://${normalized}:9191`;
  },
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
};

contextBridge.exposeInMainWorld('jiboStudio', api);
