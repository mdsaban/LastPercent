import dgram from 'dgram';
import Bonjour from 'bonjour-service';
import type { Browser, Service } from 'bonjour-service';
import { stateStore } from '../services/state.store';
import { BONJOUR_SERVICE_TYPE, MULTICAST_PORT, HEARTBEAT_INTERVAL_MS, APP_VERSION } from '../../shared/constants';
import { parseMessage } from './protocol';
import type { Heartbeat, ChargerRequest } from './protocol';
import type { PersistenceService } from '../services/persistence.service';

export class GossipService {
  private socket: dgram.Socket | null = null;
  private timer: NodeJS.Timeout | null = null;
  private bonjour: InstanceType<typeof Bonjour> | null = null;
  private browser: Browser | null = null;
  private knownPeers = new Map<string, string>(); // peerId → IP
  private persistence: PersistenceService;

  constructor(persistence: PersistenceService) {
    this.persistence = persistence;
  }

  start() {
    // UDP socket — bound to all interfaces, receives unicast heartbeats
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.bind(MULTICAST_PORT, () => {
      console.log('[Gossip] UDP socket ready on port', MULTICAST_PORT);
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

    // Announce our presence via mDNS (224.0.0.251:5353 — allowed on virtually all networks)
    this.bonjour = new Bonjour();
    this.bonjour.publish({
      name: this.persistence.get('peerId'),
      type: BONJOUR_SERVICE_TYPE,
      port: MULTICAST_PORT,
      protocol: 'udp',
    });

    // Discover peers — their IPs are stored for unicast delivery
    this.browser = this.bonjour.find({ type: BONJOUR_SERVICE_TYPE, protocol: 'udp' });

    this.browser.on('up', (service: Service) => {
      const peerId = service.name;
      if (peerId === this.persistence.get('peerId')) return;

      // prefer a routable LAN address; skip loopback and APIPA link-local
      const ip =
        service.addresses?.find((a) => !a.startsWith('127.') && !a.startsWith('169.254.')) ??
        service.referer?.address;

      if (!ip) {
        console.warn('[Gossip] Discovered peer', peerId.slice(0, 8), 'but no usable IP in response');
        return;
      }

      console.log('[Gossip] Discovered peer', peerId.slice(0, 8), 'at', ip);
      this.knownPeers.set(peerId, ip);
      this.broadcast(); // immediately push our state to the new peer
    });

    this.browser.on('down', (service: Service) => {
      console.log('[Gossip] Peer left mDNS', service.name.slice(0, 8));
      this.knownPeers.delete(service.name);
      stateStore.removePeer(service.name);
    });

    setTimeout(() => this.broadcast(), 1_000);
    this.timer = setInterval(() => this.broadcast(), HEARTBEAT_INTERVAL_MS);

    console.log('[Gossip] Started (mDNS discovery + unicast UDP)');
  }

  restart() {
    this.stop();
    this.start();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;

    this.browser?.stop();
    this.browser = null;

    // unpublishAll sends a DNS-SD TTL=0 goodbye so peers' browsers fire 'down'
    this.bonjour?.unpublishAll();
    this.bonjour?.destroy();
    this.bonjour = null;

    this.knownPeers.clear();

    try { this.socket?.close(); } catch { /* already closed */ }
    this.socket = null;
  }

  sendGoodbye() {
    const pkt = JSON.stringify({ type: 'goodbye', v: 1, peerId: this.persistence.get('peerId') });
    this.sendToAll(pkt);
  }

  broadcastNow() {
    this.broadcast();
  }

  sendChargerRequest(toPeerId: string) {
    const self = stateStore.getSelf();
    if (!self) return;
    const ip = this.knownPeers.get(toPeerId);
    if (!ip) return;
    this.sendTo(JSON.stringify({
      type: 'charger_request',
      v: 1,
      toPeerId,
      from: { peerId: self.peerId, displayName: self.displayName, emoji: self.emoji, battery: self.battery },
    }), ip);
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
    for (const ip of this.knownPeers.values()) {
      this.sendTo(payload, ip);
    }
  }

  private sendTo(payload: string, ip: string) {
    if (!this.socket) return;
    const buf = Buffer.from(payload, 'utf8');
    if (buf.length > 1400) {
      console.warn('[Gossip] payload exceeds safe UDP size:', buf.length, 'bytes — dropping');
      return;
    }
    this.socket.send(buf, MULTICAST_PORT, ip, (err) => {
      if (err) console.error('[Gossip] send error to', ip, ':', err.message);
    });
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
