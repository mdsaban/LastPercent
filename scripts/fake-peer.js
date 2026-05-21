/**
 * Fake peer for local dev testing.
 * Announces via mDNS (Bonjour) so the app discovers it, then sends
 * UDP heartbeats directly to localhost — no multicast needed.
 *
 * Usage:
 *   node scripts/fake-peer.js                          # peer at 42%
 *   node scripts/fake-peer.js --battery 8              # triggers low-battery alert
 *   node scripts/fake-peer.js --charging --battery 83  # will cross high-battery threshold
 *   node scripts/fake-peer.js --count 3                # three peers at once
 *   node scripts/fake-peer.js --fast                   # broadcast every 1s instead of 8s
 */

const dgram = require('dgram');
const { randomUUID } = require('crypto');
const { Bonjour } = require('bonjour-service');

const PORT = 41234;
const HOST = '127.0.0.1';

// ── Parse CLI flags ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const COUNT    = parseInt(arg('count', '1'), 10);
const FAST     = flag('fast');
const INTERVAL = FAST ? 1_000 : 8_000;
const NAMES    = ['Alex', 'Priya', 'Sam', 'Jordan', 'Lee'];
const EMOJIS   = ['🦊', '🐙', '🌵', '🎸', '🦋'];

// ── Build peers ──────────────────────────────────────────────────────────────
const peers = Array.from({ length: COUNT }, (_, i) => {
  const highBattery = flag('high-battery');
  return {
    peerId:      randomUUID(),
    displayName: COUNT === 1 ? arg('name', 'Test Peer') : NAMES[i % NAMES.length],
    emoji:       EMOJIS[i % EMOJIS.length],
    battery:     highBattery ? 83 : COUNT === 1 ? parseInt(arg('battery', '42'), 10) : 20 + i * 15,
    isCharging:  highBattery ? true : COUNT === 1 ? flag('charging') : i % 2 === 0,
    isPluggedIn: highBattery ? true : COUNT === 1 ? flag('charging') : i % 2 === 0,
    isVisible:   !flag('hidden'),
    status:      'available',
  };
});

// ── UDP socket ───────────────────────────────────────────────────────────────
const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
socket.bind(0);
socket.on('error', (err) => { console.error('[fake-peer] socket error:', err.message); process.exit(1); });

function sendHeartbeat(peer) {
  if (peer.isCharging && peer.battery < 100) peer.battery = Math.min(100, peer.battery + 2);
  if (!peer.isCharging && peer.battery > 0)  peer.battery = Math.max(0,   peer.battery - 1);

  const msg = JSON.stringify({
    type:          'heartbeat',
    v:             1,
    peerId:        peer.peerId,
    displayName:   peer.displayName,
    emoji:         peer.emoji,
    battery:       peer.battery,
    isCharging:    peer.isCharging,
    isPluggedIn:   peer.isPluggedIn,
    isVisible:     peer.isVisible,
    status:        peer.status,
    lastUpdatedAt: Date.now(),
    appVersion:    '0.1.4',
  });

  socket.send(Buffer.from(msg, 'utf8'), PORT, HOST, (err) => {
    if (err) console.error('[fake-peer] send error:', err.message);
  });

  const bar = '█'.repeat(Math.floor(peer.battery / 10)) + '░'.repeat(10 - Math.floor(peer.battery / 10));
  console.log(`[fake-peer] ${peer.emoji} ${peer.displayName.padEnd(12)} ${bar} ${String(peer.battery).padStart(3)}% ${peer.isCharging ? '🔌' : '  '} ${peer.isVisible ? '' : '🔒'}`);
}

// ── Bonjour — announce each peer so the app discovers it via mDNS ────────────
const bonjour = new Bonjour();

for (const peer of peers) {
  bonjour.publish({
    name:     peer.peerId,
    type:     'lastpercent',
    port:     PORT,
    protocol: 'udp',
  });
}

console.log(`\n[fake-peer] ${COUNT} peer(s) announced via mDNS + sending to ${HOST}:${PORT} every ${INTERVAL / 1000}s`);
if (flag('high-battery')) console.log('[fake-peer] Starting at 83% charging — watch for high-battery alert at 85%');
console.log('[fake-peer] Ctrl+C to stop (peers vanish immediately via mDNS goodbye)\n');

// Send first batch after a short delay so Bonjour has time to announce
setTimeout(() => {
  for (const peer of peers) sendHeartbeat(peer);
  setInterval(() => { for (const peer of peers) sendHeartbeat(peer); }, INTERVAL);
}, 500);

// ── Clean shutdown ───────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[fake-peer] Sending goodbye and unpublishing mDNS...');
  for (const peer of peers) {
    const msg = JSON.stringify({ type: 'goodbye', v: 1, peerId: peer.peerId });
    socket.send(Buffer.from(msg, 'utf8'), PORT, HOST);
  }
  bonjour.unpublishAll(() => {
    bonjour.destroy();
    setTimeout(() => process.exit(0), 200);
  });
});
