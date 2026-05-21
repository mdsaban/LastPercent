import dgram from 'dgram';
import os from 'os';
import { stateStore } from '../services/state.store';
import { MULTICAST_PORT, HEARTBEAT_INTERVAL_MS, APP_VERSION } from '../../shared/constants';
import { parseMessage } from './protocol';
import type { Heartbeat, ChargerRequest } from './protocol';
import type { PersistenceService } from '../services/persistence.service';

// Returns the directed broadcast address for each active LAN interface.
// e.g. IP=192.168.1.16, mask=255.255.255.0 → 192.168.1.255
// Broadcast avoids multicast group filtering (IGMP snooping) on consumer routers.
function getBroadcastAddresses(): string[] {
  const result: string[] = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const addr of iface ?? []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const ip = addr.address.split('.').map(Number);
      const mask = addr.netmask.split('.').map(Number);
      const bcast = ip.map((b, i) => (b | (~mask[i] & 0xff))).join('.');
      if (!result.includes(bcast)) result.push(bcast);
    }
  }
  return result;
}

export class GossipService {
  private socket: dgram.Socket | null = null;
  private timer: NodeJS.Timeout | null = null;
  private persistence: PersistenceService;

  constructor(persistence: PersistenceService) {
    this.persistence = persistence;
  }

  start() {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.bind(MULTICAST_PORT, () => {
      this.socket?.setBroadcast(true);
      const bcast = getBroadcastAddresses();
      console.log('[Gossip] Broadcast targets:', bcast.join(', ') || 'none');
      console.log('[Gossip] Ready on port', MULTICAST_PORT);
    });

    this.socket.on('message', (buf, rinfo) => {
      const raw = buf.toString('utf8');
      const msg = parseMessage(raw);
      if (!msg) {
        console.warn('[Gossip] Unparseable packet from', rinfo.address, raw.slice(0, 80));
        return;
      }
      if (msg.type === 'heartbeat') this.handleHeartbeat(msg);
      if (msg.type === 'goodbye') stateStore.removePeer(msg.peerId);
      if (msg.type === 'charger_request') this.handleChargerRequest(msg);
    });

    this.socket.on('error', (err) => {
      console.error('[Gossip] socket error:', err.message);
    });

    setTimeout(() => this.broadcast(), 1_000);
    this.timer = setInterval(() => this.broadcast(), HEARTBEAT_INTERVAL_MS);

    console.log('[Gossip] Started (UDP broadcast) on port', MULTICAST_PORT);
  }

  restart() {
    this.stop();
    this.start();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    try { this.socket?.close(); } catch { /* already closed */ }
    this.socket = null;
  }

  sendGoodbye() {
    this.sendToAll(JSON.stringify({ type: 'goodbye', v: 1, peerId: this.persistence.get('peerId') }));
  }

  broadcastNow() {
    this.broadcast();
  }

  sendChargerRequest(toPeerId: string) {
    const self = stateStore.getSelf();
    if (!self) return;
    this.sendToAll(JSON.stringify({
      type: 'charger_request',
      v: 1,
      toPeerId,
      from: { peerId: self.peerId, displayName: self.displayName, emoji: self.emoji, battery: self.battery },
    }));
  }

  private broadcast() {
    const self = stateStore.getSelf();
    if (!self) return;

    const isVisible = this.persistence.get('isVisible');

    const heartbeat: Heartbeat = {
      type: 'heartbeat',
      v: 1,
      peerId: self.peerId,
      displayName: self.displayName,
      emoji: self.emoji,
      // strip battery data when hidden so nothing leaks over the wire
      battery: isVisible ? self.battery : 0,
      isCharging: isVisible ? self.isCharging : false,
      isPluggedIn: isVisible ? self.isPluggedIn : false,
      isVisible,
      status: self.status,
      lastUpdatedAt: Date.now(),
      appVersion: APP_VERSION,
    };

    this.sendToAll(JSON.stringify(heartbeat));
  }

  private sendToAll(payload: string) {
    if (!this.socket) return;
    const buf = Buffer.from(payload, 'utf8');
    if (buf.length > 1400) {
      console.warn('[Gossip] payload exceeds safe UDP size:', buf.length, 'bytes — dropping');
      return;
    }
    for (const bcast of getBroadcastAddresses()) {
      this.socket.send(buf, MULTICAST_PORT, bcast, (err) => {
        if (err) console.error('[Gossip] send error to', bcast, ':', err.message);
      });
    }
  }

  private handleChargerRequest(msg: ChargerRequest) {
    if (msg.toPeerId !== this.persistence.get('peerId')) return;
    stateStore.emit('alert', { type: 'charger-request', from: msg.from });
  }

  private handleHeartbeat(msg: Heartbeat) {
    if (msg.peerId === this.persistence.get('peerId')) return;

    console.log('[Gossip] Heartbeat from', msg.displayName, `(${msg.peerId.slice(0, 8)}…) battery=${msg.battery}%`);

    stateStore.updatePeer({
      peerId: msg.peerId,
      displayName: msg.displayName,
      emoji: msg.emoji,
      battery: msg.battery,
      isCharging: msg.isCharging,
      isPluggedIn: msg.isPluggedIn,
      isVisible: msg.isVisible ?? true,
      status: msg.status,
      lastUpdatedAt: msg.lastUpdatedAt,
      appVersion: msg.appVersion,
    });
  }
}
