import { BrowserWindow } from 'electron';
import * as path from 'path';

let settingsWin: BrowserWindow | null = null;

export function openSettingsWindow() {
  if (settingsWin) {
    settingsWin.focus();
    return;
  }

  settingsWin = new BrowserWindow({
    width: 480,
    height: 540,
    show: true,
    resizable: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    settingsWin.loadURL(`${process.env.ELECTRON_RENDERER_URL}#settings`);
  } else {
    settingsWin.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: 'settings' });
  }

  settingsWin.on('closed', () => {
    settingsWin = null;
  });
}
