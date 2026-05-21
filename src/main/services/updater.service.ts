import { autoUpdater, UpdateInfo } from 'electron-updater';
import { shell } from 'electron';

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export type UpdateState =
  | { status: 'idle' }
  | { status: 'available'; version: string }
  | { status: 'error'; message: string };

export class UpdaterService {
  private onStateChange: (state: UpdateState) => void;
  private checkTimer: NodeJS.Timeout | null = null;
  private availableVersion: string | null = null;

  constructor(onStateChange: (state: UpdateState) => void) {
    this.onStateChange = onStateChange;
  }

  start() {
    // Don't download — Squirrel.Mac rejects unsigned builds at install time.
    // We only use electron-updater to check the latest version number.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = false;

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('[Updater] Update available:', info.version);
      this.availableVersion = info.version;
      this.onStateChange({ status: 'available', version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
      this.availableVersion = null;
      this.onStateChange({ status: 'idle' });
    });

    autoUpdater.on('error', (err) => {
      // Fail silently — usually offline or GitHub rate-limited
      console.log('[Updater] Check failed:', err.message);
    });

    setTimeout(() => this.check(), 10_000);
    this.checkTimer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
  }

  stop() {
    if (this.checkTimer) clearInterval(this.checkTimer);
  }

  check() {
    autoUpdater.checkForUpdates().catch(() => {});
  }

  /** Open the GitHub release page for the available version (or the releases list). */
  openReleasesPage() {
    const url = this.availableVersion
      ? `https://github.com/mdsaban/lastpercent/releases/tag/v${this.availableVersion}`
      : 'https://github.com/mdsaban/lastpercent/releases';
    shell.openExternal(url);
  }

  /** No-op — kept for API compatibility; install is handled via openReleasesPage. */
  quitAndInstall() {
    this.openReleasesPage();
  }
}
