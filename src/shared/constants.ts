export const MULTICAST_ADDR = '239.255.42.99';
export const MULTICAST_PORT = 41234;
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const PEER_AWAY_TIMEOUT_MS = 90_000;       // 90s no heartbeat → mark away
export const PEER_PRUNE_TIMEOUT_MS = 600_000;     // 10 min → remove entirely
export const BATTERY_WARN_THRESHOLD = 20;
export const BATTERY_CRITICAL_THRESHOLD = 10;
declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const PASTEL_PALETTE = [
  '#e9d5ff', // purple
  '#bbf7d0', // mint
  '#fed7aa', // peach
  '#bae6fd', // sky
  '#fbcfe8', // rose
  '#fef3c7', // lemon
  '#ddd6fe', // lavender
  '#d1fae5', // sage
] as const;
