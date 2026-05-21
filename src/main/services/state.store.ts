import { EventEmitter } from 'events';
import type { PeerState, AppState, AppAlert } from '../../shared/types';
import {
  PEER_AWAY_TIMEOUT_MS,
  PEER_PRUNE_TIMEOUT_MS,
  BATTERY_CRITICAL_THRESHOLD,
} from '../../shared/constants';

export declare interface StateStore {
  on(event: 'updated', listener: (state: AppState) => void): this;
  on(event: 'alert', listener: (alert: AppAlert) => void): this;
  emit(event: 'updated', state: AppState): boolean;
  emit(event: 'alert', alert: AppAlert): boolean;
}

export class StateStore extends EventEmitter {
  private peers = new Map<string, PeerState>();
  private selfId: string | null = null;
  private networkName: string | null = null;
  private networkNameUnavailable = false;
  private pruneTimer: NodeJS.Timeout | null = null;
  private selfLowBatteryNotified = false;
  private highBatteryThreshold = 85;

  start(selfId: string) {
    this.selfId = selfId;
    this.selfLowBatteryNotified = false;
    this.pruneTimer = setInterval(() => this.prune(), 30_000);
  }

  stop() {
    if (this.pruneTimer) clearInterval(this.pruneTimer);
    this.pruneTimer = null;
  }

  setHighBatteryThreshold(threshold: number) {
    this.highBatteryThreshold = threshold;
  }

  setNetworkName(name: string | null, unavailable = false) {
    this.networkName = name;
    this.networkNameUnavailable = unavailable;
    this.emit('updated', this.getAppState());
  }

  updatePeer(incoming: Omit<PeerState, 'lastSeenAt' | 'isSelf'>) {
    const existing = this.peers.get(incoming.peerId);

    // drop stale out-of-order UDP packets
    if (existing && incoming.lastUpdatedAt < existing.lastUpdatedAt) return;

    const isSelf = incoming.peerId === this.selfId;
    const next: PeerState = {
      ...incoming,
      lastSeenAt: Date.now(),
      isSelf,
    };

    this.peers.set(incoming.peerId, next);
    this.emit('updated', this.getAppState());

    // battery threshold alerts for visible peers
    if (existing && !isSelf && next.isVisible !== false) {
      const crossedLow =
        existing.battery >= BATTERY_CRITICAL_THRESHOLD &&
        next.battery < BATTERY_CRITICAL_THRESHOLD;
      if (crossedLow) {
        this.emit('alert', { type: 'low-battery', peer: next });
      }

      const crossedHigh =
        existing.battery < this.highBatteryThreshold &&
        next.battery >= this.highBatteryThreshold;
      if (crossedHigh) {
        this.emit('alert', { type: 'high-battery', peer: next });
      }
    }

    // self low-battery nudge: fires once per session below threshold
    if (isSelf && next.battery < BATTERY_CRITICAL_THRESHOLD && !next.isCharging) {
      if (!this.selfLowBatteryNotified) {
        this.selfLowBatteryNotified = true;
        this.emit('alert', { type: 'self-low-battery', battery: next.battery });
      }
    } else if (isSelf && next.isCharging) {
      // reset so nudge fires again after they plug in and discharge again
      this.selfLowBatteryNotified = false;
    }
  }

  removePeer(peerId: string) {
    if (this.peers.delete(peerId)) {
      this.emit('updated', this.getAppState());
    }
  }

  getSelf(): PeerState | null {
    if (!this.selfId) return null;
    return this.peers.get(this.selfId) ?? null;
  }

  getAppState(): AppState {
    const all = [...this.peers.values()];
    const self = all.find(p => p.isSelf) ?? null;
    const peers = all.filter(p => !p.isSelf);

    let status: AppState['status'] = 'discovering';
    if (peers.length > 0) status = 'connected';
    else if (self) status = 'no-peers';

    return { self, peers, networkName: this.networkName, networkNameUnavailable: this.networkNameUnavailable, status };
  }

  private prune() {
    const now = Date.now();
    let changed = false;

    for (const [peerId, peer] of this.peers) {
      if (peer.isSelf) continue;

      const age = now - peer.lastSeenAt;

      if (age > PEER_PRUNE_TIMEOUT_MS) {
        this.peers.delete(peerId);
        changed = true;
      } else if (age > PEER_AWAY_TIMEOUT_MS && peer.status !== 'away') {
        this.peers.set(peerId, { ...peer, status: 'away' });
        changed = true;
      }
    }

    if (changed) this.emit('updated', this.getAppState());
  }
}

export const stateStore = new StateStore();
