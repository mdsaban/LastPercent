import { app, powerMonitor, ipcMain } from 'electron';
import { TrayManager } from './tray';
import { DropdownWindow } from './windows/dropdown';
import { NotchWindow } from './windows/notch';
import { openSettingsWindow } from './windows/settings';
import { persistence } from './services/persistence.service';
import { BatteryService } from './services/battery.service';
import { stateStore } from './services/state.store';
import { registerHandlers } from './ipc/handlers';
import { GossipService } from './network/gossip';
import { sendNotification } from './services/notification.service';
import { detectNetworkName } from './services/network-info.service';
import { UpdaterService } from './services/updater.service';
import { startDevNotchTrigger } from './services/dev-notch-trigger';

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.dock?.hide();

let tray: TrayManager;
let dropdown: DropdownWindow;
let notch: NotchWindow;
let battery: BatteryService;
let gossip: GossipService;
let updater: UpdaterService;

app.whenReady().then(async () => {
  stateStore.start(persistence.get('peerId'));
  stateStore.setHighBatteryThreshold(persistence.get('notifications').highBatteryThreshold);

  battery = new BatteryService(persistence);
  gossip = new GossipService(persistence);

  dropdown = new DropdownWindow();
  dropdown.create();

  notch = new NotchWindow();
  notch.create();

  updater = new UpdaterService((state) => {
    tray.setUpdateState(state);
    dropdown.sendUpdateState(state);
  });

  registerHandlers({ persistence, battery, gossip, updater });

  ipcMain.handle('show-dropdown', () => {
    const bounds = tray?.getBounds();
    if (bounds) dropdown?.toggle(bounds);
  });

  tray = new TrayManager({
    onToggle: () => {
      const bounds = tray.getBounds();
      if (bounds) dropdown.toggle(bounds);
    },
    onQuitAndInstall: () => updater.quitAndInstall(),
    onCheckForUpdates: () => updater.check(),
  });
  tray.create();

  await battery.start();
  gossip.start();
  startDevNotchTrigger(notch);

  detectNetworkName();
  updater.start();

  if (!persistence.get('hasCompletedOnboarding')) {
    setTimeout(() => openSettingsWindow(), 1_500);
  }

  stateStore.on('alert', (alert) => {
    const notificationsEnabled = persistence.get('notifications').enabled;

    if (notificationsEnabled) {
      if (alert.type === 'low-battery') {
        const { emoji, displayName, battery: pct } = alert.peer;
        notch.show({ type: 'low-battery', emoji, name: displayName, battery: pct });
        sendNotification('Low Battery', `${displayName} is at ${pct}%`);
      }

      if (alert.type === 'self-low-battery') {
        notch.show({ type: 'self-low-battery', battery: alert.battery });
      }

      if (alert.type === 'high-battery') {
        const { emoji, displayName, battery: pct } = alert.peer;
        notch.show({ type: 'high-battery', emoji, name: displayName, battery: pct });
        sendNotification('Battery Charged', `${emoji} ${displayName} is at ${pct}%`);
      }

      if (alert.type === 'charger-request') {
        const { emoji, displayName, battery: pct } = alert.from;
        notch.show({ type: 'charger-request', from: { emoji, name: displayName, battery: pct } });
        sendNotification(`${emoji} Charger Request`, `${displayName} needs the charger (${pct}%)`);
      }
    }

    dropdown.sendAlert(alert);
  });

  powerMonitor.on('suspend', () => {
    gossip.sendGoodbye();
    stateStore.stop();
  });

  powerMonitor.on('resume', async () => {
    stateStore.start(persistence.get('peerId'));
    await battery.forcePoll();
    gossip.restart();
    detectNetworkName();
  });

  // Broadcast immediately when charger is plugged/unplugged so peers see
  // the charging state change without waiting for the next 10s heartbeat.
  powerMonitor.on('on-ac', async () => {
    await battery.forcePoll();
    gossip.broadcastNow();
  });

  powerMonitor.on('on-battery', async () => {
    await battery.forcePoll();
    gossip.broadcastNow();
  });
});

app.on('second-instance', () => {
  const bounds = tray?.getBounds();
  if (bounds) dropdown?.toggle(bounds);
});

app.on('window-all-closed', () => { /* menu bar app — stay alive */ });

app.on('before-quit', () => {
  gossip?.sendGoodbye();
  stateStore.stop();
  gossip?.stop();
  updater?.stop();
  tray?.destroy();
});
