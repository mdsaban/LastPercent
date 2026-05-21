/**
 * Fire a one-shot notch notification for visual testing.
 *
 * Usage:
 *   node scripts/test-notch.js                                   # low-battery (default)
 *   node scripts/test-notch.js --type high-battery
 *   node scripts/test-notch.js --type self-low-battery
 *   node scripts/test-notch.js --type charger-request
 *   node scripts/test-notch.js --duration 6000                   # show for 6s (default 4s)
 *   node scripts/test-notch.js --battery 7 --name "Alex" --emoji 🦊
 *
 * The app must be running in dev mode (npm run dev).
 */

const dgram  = require('dgram');
const PORT   = 41235;
const HOST   = '127.0.0.1';

// ── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const arg  = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const type     = arg('type', 'low-battery');
const duration = parseInt(arg('duration', '4000'), 10);
const battery  = parseInt(arg('battery',  '8'),    10);
const name     = arg('name',  'Test Peer');
const emoji    = arg('emoji', '🦊');

const VALID_TYPES = ['low-battery', 'high-battery', 'self-low-battery', 'charger-request'];
if (!VALID_TYPES.includes(type)) {
  console.error(`Unknown type "${type}". Valid: ${VALID_TYPES.join(', ')}`);
  process.exit(1);
}

// ── Build payload ────────────────────────────────────────────────────────────
function buildPayload() {
  switch (type) {
    case 'low-battery':
      return { type: 'low-battery', emoji, name, battery };
    case 'high-battery':
      return { type: 'high-battery', emoji, name, battery: parseInt(arg('battery', '85'), 10) };
    case 'self-low-battery':
      return { type: 'self-low-battery', battery };
    case 'charger-request':
      return { type: 'charger-request', from: { emoji, name, battery } };
  }
}

const message = JSON.stringify({ payload: buildPayload(), duration });

// ── Send ─────────────────────────────────────────────────────────────────────
const socket = dgram.createSocket('udp4');
socket.send(Buffer.from(message), PORT, HOST, (err) => {
  if (err) {
    console.error('[test-notch] failed to send — is the app running in dev mode?');
    console.error(err.message);
  } else {
    console.log(`[test-notch] sent → type=${type}, duration=${duration}ms`);
    console.log(`             payload: ${JSON.stringify(buildPayload())}`);
  }
  socket.close();
});
