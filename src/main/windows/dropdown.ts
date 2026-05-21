import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { stateStore } from '../services/state.store';
import type { AppAlert } from '../../shared/types';
import type { UpdateState } from '../services/updater.service';

const WINDOW_WIDTH = 320;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 40;
const FOOTER_HEIGHT = 32;
const DIVIDER_HEIGHT = 2;
const EMPTY_STATE_HEIGHT = 100;
const WINDOW_PADDING = 12;

function computeHeight(peerCount: number): number {
  const rows = Math.max(peerCount, 1); // at least the empty state
  const listHeight = peerCount === 0 ? EMPTY_STATE_HEIGHT : rows * ROW_HEIGHT + WINDOW_PADDING;
  return HEADER_HEIGHT + DIVIDER_HEIGHT + listHeight + DIVIDER_HEIGHT + FOOTER_HEIGHT;
}

export class DropdownWindow {
  private win: BrowserWindow | null = null;

  create() {
    this.win = new BrowserWindow({
      width: WINDOW_WIDTH,
      height: 300,
      show: false,
      frame: false,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      hasShadow: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.env.ELECTRON_RENDERER_URL) {
      this.win.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
      this.win.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Delay hide so the window doesn't vanish when the native context menu closes
    // and triggers blur before the window finishes appearing.
    this.win.on('blur', () => setTimeout(() => {
      if (!this.win?.isFocused()) this.hide();
    }, 150));

    // push state updates to the renderer while visible
    stateStore.on('updated', (state) => {
      if (this.win?.isVisible()) {
        this.win.webContents.send('state-update', state);
      }
    });

    stateStore.on('alert', (alert) => {
      this.win?.webContents.send('alert', alert);
    });
  }

  toggle(trayBounds: Electron.Rectangle) {
    if (this.win?.isVisible()) {
      this.hide();
    } else {
      this.show(trayBounds);
    }
  }

  private show(trayBounds: Electron.Rectangle) {
    if (!this.win) return;

    const state = stateStore.getAppState();
    const peerCount = (state.self ? 1 : 0) + state.peers.length;
    const height = Math.min(computeHeight(peerCount), 560);

    const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
    const { workArea } = display;

    const rawX = trayBounds.width > 0
      ? trayBounds.x + trayBounds.width / 2 - WINDOW_WIDTH / 2
      : workArea.x + workArea.width / 2 - WINDOW_WIDTH / 2;
    const x = Math.max(workArea.x + 4, Math.min(Math.round(rawX), workArea.x + workArea.width - WINDOW_WIDTH - 4));

    // on macOS the menu bar is always at the top; show below the tray icon
    // fall back to workArea.y when tray bounds are zero (empty nativeImage)
    const y = trayBounds.height > 0
      ? trayBounds.y + trayBounds.height + 8
      : workArea.y + 8;

    this.win.setSize(WINDOW_WIDTH, height);
    this.win.setPosition(x, y);
    // Join all Spaces momentarily so macOS shows the window on the active
    // Space instead of switching to the Space where it was last visible.
    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.win.show();
    this.win.focus();
    this.win.setVisibleOnAllWorkspaces(false);
    this.win.webContents.send('state-update', state);
  }

  private hide() {
    this.win?.hide();
  }

  sendAlert(alert: AppAlert) {
    this.win?.webContents.send('alert', alert);
  }

  sendUpdateState(state: UpdateState) {
    this.win?.webContents.send('update-state', state);
  }

  destroy() {
    this.win?.destroy();
    this.win = null;
  }
}
