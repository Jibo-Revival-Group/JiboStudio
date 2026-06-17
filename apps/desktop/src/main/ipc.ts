import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import chokidar from 'chokidar';
import { join as pathJoin } from 'path';
import { getVendorRoot, getTemplatesDir } from './paths';
import {
  listDirectoryTree,
  readProjectFile,
  writeProjectFile,
  copyTemplate,
  customizeSkillProject,
  installBundledDeps,
} from './project-manager';
import {
  loadRobotProfiles,
  upsertRobotProfile,
  deleteRobotProfile,
} from './robot-profiles';
import {
  setMainWindow,
  buildSkill,
  watchSkill,
  stopWatch,
  syncToRobot,
  runOnRobot,
  stopOnRobot,
} from './toolchain-runner';
import { testRobotConnection } from './robot-connection';
import type { CreateSkillOptions, RobotProfile } from '../shared/types';

let watcher: chokidar.FSWatcher | null = null;

export function registerIpcHandlers(): void {
  ipcMain.handle('project:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open Jibo Skill Project',
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle('project:createFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose Parent Folder for New Skill',
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle('project:listFiles', (_e, rootPath: string) => listDirectoryTree(rootPath));

  ipcMain.handle('project:readFile', (_e, filePath: string) => readProjectFile(filePath));

  ipcMain.handle('project:writeFile', (_e, filePath: string, content: string) => {
    writeProjectFile(filePath, content);
  });

  ipcMain.handle('project:watch', (event, rootPath: string) => {
    watcher?.close();
    watcher = chokidar.watch(rootPath, {
      ignored: /node_modules|build|vendor/,
      ignoreInitial: true,
    });
    watcher.on('all', (ev, path) => {
      event.sender.send('project:changed', ev, path);
    });
  });

  ipcMain.handle('vendor:getPath', () => getVendorRoot());

  ipcMain.handle('skill:create', async (_e, options: CreateSkillOptions) => {
    const targetDir = pathJoin(options.targetDir, options.name);
    copyTemplate(getTemplatesDir(), targetDir);
    customizeSkillProject(targetDir, options);
    const installResult = installBundledDeps(targetDir);
    if (!installResult.success) {
      return { success: false, code: 1, output: installResult.message };
    }
    const buildResult = await buildSkill(targetDir);
    if (buildResult.success) {
      return {
        ...buildResult,
        output: `${installResult.message}\n${buildResult.output}`,
      };
    }
    return buildResult;
  });

  ipcMain.handle('toolchain:build', (_e, projectPath: string) => buildSkill(projectPath));

  ipcMain.handle('toolchain:watch', (_e, projectPath: string) => watchSkill(projectPath));

  ipcMain.handle('toolchain:stopWatch', () => stopWatch());

  ipcMain.handle('robot:getProfiles', () => loadRobotProfiles());

  ipcMain.handle('robot:saveProfile', (_e, profile: RobotProfile) => upsertRobotProfile(profile));

  ipcMain.handle('robot:deleteProfile', (_e, id: string) => deleteRobotProfile(id));

  ipcMain.handle('robot:testConnection', (_e, host: string) => testRobotConnection(host));

  ipcMain.handle('robot:sync', (_e, projectPath: string, host: string) =>
    syncToRobot(projectPath, host),
  );

  ipcMain.handle('robot:run', (_e, projectPath: string, host: string) =>
    runOnRobot(projectPath, host),
  );

  ipcMain.handle('robot:stop', (_e, host: string) => stopOnRobot(host));

  ipcMain.handle('app:getVersion', () => app.getVersion());
}

export function setupWindow(win: BrowserWindow): void {
  setMainWindow(win);
}
