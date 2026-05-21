import { ipcMain, app, shell } from 'electron';
import { stateStore } from '../services/state.store';
import { openSettingsWindow } from '../windows/settings';
import type { PersistenceService } from '../services/persistence.service';
import type { BatteryService } from '../services/battery.service';
import type { GossipService } from '../network/gossip';
import type { UpdaterService } from '../services/updater.service';
import type { UserPrefs } from '../../shared/types';

export interface AppServices {
  persistence: PersistenceService;
  battery: BatteryService;
  gossip: GossipService;
  updater: UpdaterService;
}

export function registerHandlers(services: AppServices) {
  const { persistence, battery, gossip, updater } = services;

  ipcMain.handle('get-state', () => stateStore.getAppState());

  ipcMain.handle('get-prefs', (): UserPrefs => ({
    displayName: persistence.get('displayName'),
    emoji: persistence.get('emoji'),
    isVisible: persistence.get('isVisible'),
    launchAtLogin: persistence.get('launchAtLogin'),
    notifications: persistence.get('notifications'),
  }));

  ipcMain.handle('set-prefs', async (_e, prefs: Partial<UserPrefs>) => {
    const wasVisible = persistence.get('isVisible');

    if (prefs.displayName !== undefined) persistence.set('displayName', prefs.displayName);
    if (prefs.emoji !== undefined) persistence.set('emoji', prefs.emoji);
    if (prefs.isVisible !== undefined) persistence.set('isVisible', prefs.isVisible);
    if (prefs.launchAtLogin !== undefined) {
      persistence.set('launchAtLogin', prefs.launchAtLogin);
      app.setLoginItemSettings({ openAtLogin: prefs.launchAtLogin });
    }
    if (prefs.notifications !== undefined) {
      persistence.set('notifications', prefs.notifications);
      stateStore.setHighBatteryThreshold(prefs.notifications.highBatteryThreshold);
    }

    if (prefs.isVisible !== undefined) {
      if (prefs.isVisible && !wasVisible) {
        await battery.forcePoll();
        gossip.broadcastNow();
      } else if (!prefs.isVisible && wasVisible) {
        gossip.broadcastNow();
      }
    } else {
      await battery.forcePoll();
      gossip.broadcastNow();
    }

    if (!persistence.get('hasCompletedOnboarding')) {
      persistence.set('hasCompletedOnboarding', true);
    }
  });

  ipcMain.handle('request-charger', (_e, toPeerId: string) => {
    gossip.sendChargerRequest(toPeerId);
  });

  ipcMain.handle('install-update', () => updater.quitAndInstall());

  ipcMain.handle('open-settings', () => openSettingsWindow());

  ipcMain.handle('open-external', (_e, url: string) => {
    shell.openExternal(url);
  });
}
