import { powerMonitor } from 'electron';
import si from 'systeminformation';
import { stateStore } from './state.store';
import { APP_VERSION } from '../../shared/constants';
import type { PersistenceService } from './persistence.service';

export class BatteryService {
  private pollTimer: NodeJS.Timeout | null = null;
  private persistence: PersistenceService;

  constructor(persistence: PersistenceService) {
    this.persistence = persistence;
  }

  async start() {
    await this.poll();

    // 60s baseline poll — coarse enough to not drain battery
    this.pollTimer = setInterval(() => this.poll(), 60_000);

    // react immediately to power state changes
    powerMonitor.on('on-ac', () => this.poll());
    powerMonitor.on('on-battery', () => this.poll());
  }

  stop() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  async forcePoll() {
    await this.poll();
  }

  private async poll() {
    try {
      const battery = await si.battery();
      const config = this.persistence.getAll();

      // Desktop Macs (Mac mini, iMac) have no battery — treat as always-on
      const noBattery = !battery.hasBattery;

      stateStore.updatePeer({
        peerId: config.peerId,
        displayName: config.displayName,
        emoji: config.emoji,
        battery: noBattery ? 100 : Math.round(battery.percent ?? 100),
        isCharging: noBattery ? false : (battery.isCharging ?? false),
        isPluggedIn: noBattery ? true : (battery.acConnected ?? false),
        isVisible: config.isVisible,
        status: 'available',
        lastUpdatedAt: Date.now(),
        appVersion: APP_VERSION,
      });
    } catch (err) {
      console.error('[BatteryService] poll failed:', err);
    }
  }
}
