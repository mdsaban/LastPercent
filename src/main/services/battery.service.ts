import si from 'systeminformation';
import { stateStore } from './state.store';
import { APP_VERSION } from '../../shared/constants';
import type { PersistenceService } from './persistence.service';

const POLL_INTERVAL_MS = 5_000;

export class BatteryService {
  private pollTimer: NodeJS.Timeout | null = null;
  private persistence: PersistenceService;
  private onChargingChanged: (() => void) | null = null;
  private prevIsCharging: boolean | null = null;

  constructor(persistence: PersistenceService, onChargingChanged?: () => void) {
    this.persistence = persistence;
    this.onChargingChanged = onChargingChanged ?? null;
  }

  async start() {
    await this.poll();
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
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
      const noBattery = !battery.hasBattery;
      const isCharging = noBattery ? false : (battery.isCharging ?? false);

      // Fire callback when charging state flips so gossip broadcasts immediately
      if (this.prevIsCharging !== null && isCharging !== this.prevIsCharging) {
        this.onChargingChanged?.();
      }
      this.prevIsCharging = isCharging;

      stateStore.updatePeer({
        peerId: config.peerId,
        displayName: config.displayName,
        emoji: config.emoji,
        battery: noBattery ? 100 : Math.round(battery.percent ?? 100),
        isCharging,
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
