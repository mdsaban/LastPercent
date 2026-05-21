import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import type { NotchPayload } from '../../shared/types';

const WIN_WIDTH  = 420;
const WIN_HEIGHT = 200;

function getNotchInfo(): { hasNotch: boolean; notchHeight: number } {
  const display = screen.getPrimaryDisplay();
  const { bounds, workArea } = display;

  // workArea.y is the only reliable signal:
  //   notch Mac (built-in primary display) → workArea.y ≈ 37
  //   non-notch Mac or external monitor as primary → workArea.y ≈ 24
  // sysctl hw.model can't be used — since ~2022 Apple uses the same
  // Mac<N>,<n> identifiers for MacBook, Mac mini, Mac Studio, iMac, Mac Pro.
  const hasNotch    = workArea.y > 30;
  const notchHeight = workArea.y - bounds.y;

  return { hasNotch, notchHeight };
}

export class NotchWindow {
  private win: BrowserWindow | null = null;
  private hideTimer: NodeJS.Timeout | null = null;
  private offscreenY = -10_000;

  create() {
    this.win = new BrowserWindow({
      width:  WIN_WIDTH,
      height: WIN_HEIGHT,
      x: 0,
      y: this.offscreenY,
      show: false,
      frame: false,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      transparent: true,
      hasShadow: false,
      // 'panel' windows can sit above the menu bar / notch on macOS
      type: 'panel',
      focusable: false,
      hiddenInMissionControl: true,
      enableLargerThanScreen: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // screen-saver level ensures it floats above the notch bar on first create
    this.win.setAlwaysOnTop(true, 'screen-saver', 1);
    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.win.setIgnoreMouseEvents(true);

    if (process.env.ELECTRON_RENDERER_URL) {
      this.win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#notch`);
    } else {
      this.win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: 'notch' });
    }

    // Park off-screen immediately after load so it's ready but invisible
    this.win.once('ready-to-show', () => {
      const { bounds } = screen.getPrimaryDisplay();
      const x = Math.round(bounds.width / 2 - WIN_WIDTH / 2);
      this.win?.setPosition(x, this.offscreenY, false);
      this.win?.show();
    });
  }

  show(payload: NotchPayload, duration = 5_000) {
    if (!this.win) return;

    const { hasNotch, notchHeight } = getNotchInfo();
    const { bounds } = screen.getPrimaryDisplay();

    const x = Math.round(bounds.width / 2 - WIN_WIDTH / 2);
    // Always anchor at display top so the pill can overlap the physical notch
    const y = bounds.y;

    // Elevate to pop-up-menu right before showing so it clears the notch bar
    this.win.setAlwaysOnTop(true, 'pop-up-menu');
    this.win.setBounds({ x, y, width: WIN_WIDTH, height: WIN_HEIGHT }, false);
    this.win.webContents.send('notch-alert', { ...payload, hasNotch, notchHeight });

    if (this.hideTimer) clearTimeout(this.hideTimer);

    this.hideTimer = setTimeout(() => {
      this.win?.webContents.send('notch-dismiss');
      // Wait for collapse animation, then move off-screen
      setTimeout(() => {
        const { bounds: b } = screen.getPrimaryDisplay();
        const cx = Math.round(b.width / 2 - WIN_WIDTH / 2);
        this.win?.setPosition(cx, this.offscreenY, false);
        this.win?.setAlwaysOnTop(true, 'screen-saver', 1);
      }, 450);
    }, duration);
  }

  hide() {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    const { bounds } = screen.getPrimaryDisplay();
    const x = Math.round(bounds.width / 2 - WIN_WIDTH / 2);
    this.win?.setPosition(x, this.offscreenY, false);
  }

  destroy() {
    this.win?.destroy();
    this.win = null;
  }
}
