import { Tray, Menu, nativeImage, app } from 'electron';
import { stateStore } from './services/state.store';
import type { UpdateState } from './services/updater.service';

export class TrayManager {
  private tray: Tray | null = null;
  private onToggle: () => void;
  private onQuitAndInstall: () => void;
  private onCheckForUpdates: () => void;
  private updateState: UpdateState = { status: 'idle' };

  constructor(callbacks: {
    onToggle: () => void;
    onQuitAndInstall: () => void;
    onCheckForUpdates: () => void;
  }) {
    this.onToggle = callbacks.onToggle;
    this.onQuitAndInstall = callbacks.onQuitAndInstall;
    this.onCheckForUpdates = callbacks.onCheckForUpdates;
  }

  create() {
    this.tray = new Tray(nativeImage.createEmpty());
    this.tray.setTitle('⚡');
    this.tray.setToolTip('LastPercent');
    this.tray.setIgnoreDoubleClickEvents(true);

    this.tray.on('click', () => this.onToggle());
    this.tray.on('right-click', () => this.buildAndShowContextMenu());

    stateStore.on('updated', (state) => {
      if (state.self) {
        const suffix = this.updateState.status === 'available' ? ' · ↑' : '';
        this.tray?.setToolTip(`LastPercent · ${state.self.battery}%${suffix}`);
      }
    });
  }

  getBounds(): Electron.Rectangle | null {
    return this.tray?.getBounds() ?? null;
  }

  setUpdateState(state: UpdateState) {
    this.updateState = state;
    if (state.status === 'available') {
      this.tray?.setTitle('⚡ ·');
      this.tray?.setToolTip(`LastPercent · Update available (v${state.version}) — right-click to download`);
    } else {
      this.tray?.setTitle('⚡');
    }
  }

  private buildAndShowContextMenu() {
    const updateItems = this.buildUpdateMenuItems();

    const menu = Menu.buildFromTemplate([
      { label: 'Open LastPercent', click: () => this.onToggle() },
      { type: 'separator' },
      ...updateItems,
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);

    this.tray?.popUpContextMenu(menu);
  }

  private buildUpdateMenuItems(): Electron.MenuItemConstructorOptions[] {
    if (this.updateState.status === 'available') {
      return [{
        label: `Update available (v${this.updateState.version}) — click to download`,
        click: () => this.onCheckForUpdates(),
      }];
    }
    return [{
      label: 'Check for Updates',
      click: () => this.onCheckForUpdates(),
    }];
  }

  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }
}
