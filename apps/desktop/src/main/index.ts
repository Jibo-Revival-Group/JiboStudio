import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { registerIpcHandlers, setupWindow } from './ipc';
import { loadSettings } from './settings';
import type { ThemeMode } from '../shared/types';

function getWindowBackground(theme: ThemeMode): string {
  switch (theme) {
    case 'light':
      return '#f8f8f8';
    case 'deep-dark':
      return '#0a0a0a';
    default:
      return '#1e1e1e';
  }
}

// Unpackaged Linux installs (npm run dev) often lack a setuid chrome-sandbox.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

function createWindow(): void {
  const { theme } = loadSettings();
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Jibo Studio',
    backgroundColor: getWindowBackground(theme),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  setupWindow(win);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
