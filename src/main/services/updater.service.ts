import { autoUpdater, UpdateInfo } from 'electron-updater';
import { shell } from 'electron';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export type UpdateState =
  | { status: 'idle' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready'; version: string }
  | { status: 'error'; message: string };

export class UpdaterService {
  private onStateChange: (state: UpdateState) => void;
  private checkTimer: NodeJS.Timeout | null = null;

  constructor(onStateChange: (state: UpdateState) => void) {
    this.onStateChange = onStateChange;
  }

  start() {
    // download silently, install automatically when the user next quits
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('[Updater] Update available:', info.version);
      this.onStateChange({ status: 'available', version: info.version });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.onStateChange({ status: 'downloading', percent: Math.round(progress.percent) });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('[Updater] Ready to install:', info.version);
      this.onStateChange({ status: 'ready', version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
      this.onStateChange({ status: 'idle' });
    });

    autoUpdater.on('error', (err) => {
      const msg = err.message ?? String(err);
      console.error('[Updater] Error:', msg);
      // Propagate so callers can fall back to the GitHub releases page
      this.onStateChange({ status: 'error', message: msg });
    });

    // check on launch after a short delay (don't block startup)
    setTimeout(() => this.check(), 10_000);

    // then every 4 hours
    this.checkTimer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
  }

  stop() {
    if (this.checkTimer) clearInterval(this.checkTimer);
  }

  check() {
    autoUpdater.checkForUpdates().catch(() => {
      // network may be offline — fail silently
    });
  }

  /** Install immediately (called from tray "Restart to Update" menu item). */
  quitAndInstall() {
    autoUpdater.quitAndInstall(false, true);
  }

  /** Fallback for unsigned builds — opens the GitHub releases page. */
  openReleasesPage() {
    shell.openExternal('https://github.com/mdsaban/lastpercent/releases');
  }
}
