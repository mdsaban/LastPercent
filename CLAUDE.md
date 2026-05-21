# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev mode (hot-reload renderer + main)
npm run build        # compile everything to out/
npm run typecheck    # tsc --noEmit (no emit, just type errors)
npm run dist         # build + package DMG (outputs to release/)
```

To package for quick local testing without DMG:
```bash
npx electron-builder --mac --dir   # outputs to release/mac-arm64/LastPercent.app
```

## Architecture

This is a macOS-only menu bar app. No backend, no accounts — everything is LAN-only via UDP multicast.

### Process model

```
Main process (src/main/)
  ├── index.ts              — app entry: wires all services and windows together
  ├── tray.ts               — menu bar icon (⚡ emoji via setTitle, nativeImage.createEmpty())
  ├── windows/
  │   ├── dropdown.ts       — main popup below tray icon
  │   ├── notch.ts          — Dynamic Island / notch overlay
  │   └── settings.ts       — preferences panel
  ├── services/
  │   ├── state.store.ts    — in-memory EventEmitter; single source of truth for AppState
  │   ├── battery.service.ts
  │   ├── persistence.service.ts   — electron-store wrapper (~/Library/Application Support/LastPercent/config.json)
  │   ├── updater.service.ts       — electron-updater, checks GitHub Releases every 1hr
  │   ├── dev-notch-trigger.ts     — UDP server on localhost:41235 (dev mode only)
  │   └── network-info.service.ts
  ├── network/
  │   ├── gossip.ts         — UDP multicast sender/receiver
  │   └── protocol.ts       — Zod schemas + parseMessage()
  └── ipc/handlers.ts       — all ipcMain.handle() registrations

Preload (src/preload/index.ts)
  — contextBridge exposes window.electron (typed as ElectronAPI)

Renderer (src/renderer/)
  ├── main.tsx              — React root, routes #hash to Dropdown / NotchAlert / Settings
  ├── views/Dropdown.tsx
  ├── views/NotchAlert.tsx
  └── views/Settings.tsx
```

### Data flow

1. `BatteryService` polls system battery → calls `stateStore.updatePeer(selfState)`
2. `GossipService` broadcasts a heartbeat UDP packet every 10s to `239.255.42.99:41234`
3. Incoming heartbeats are validated by Zod in `protocol.ts`, merged into `stateStore`
4. `stateStore` emits `'updated'` → dropdown window pushes `state-update` IPC to renderer
5. Alert thresholds checked in `stateStore.updatePeer()` → emits `'alert'` → notch + system notification

### Key constraints

- **Tray icon**: uses `nativeImage.createEmpty()` + `setTitle('⚡')` for emoji-only icon. As a result, `tray.getBounds()` returns `{x:0,y:0,width:0,height:0}` — `dropdown.ts` has a fallback to `workArea.y + 8` for positioning.
- **Notch detection**: `workArea.y > 30` is the only reliable method. `sysctl hw.model` is NOT used — Apple uses the same `Mac<N>,<n>` identifiers across MacBook, Mac mini, iMac etc.
- **`loadFile` paths**: all three windows load `path.join(__dirname, '../renderer/index.html')`. `__dirname` in the packaged app is `app.asar/out/main/` so the path resolves to `out/renderer/index.html`. Using `../../` would be wrong (skips past `out/`).
- **Hidden peers**: when `isVisible: false`, gossip still broadcasts but with `battery: 0` and `isCharging: false` stripped — nothing leaks over the wire.
- **UDP payload limit**: gossip enforces `< 1400 bytes` per packet.

### Networking protocol

Three message types (discriminated by `type` field), all sent as JSON over UDP multicast:
- `heartbeat` — sent every 10s; peer marked `away` after 90s silence, pruned after 10min
- `goodbye` — sent on app quit / suspend
- `charger_request` — unicast-by-convention (sent multicast, filtered by `toPeerId`)

### Build output

electron-vite bundles into:
```
out/main/index.js       — entire main process (single bundle)
out/preload/index.js
out/renderer/index.html + assets/
```

electron-builder then packs `out/**/*` + `assets/**/*` into `app.asar`.

### Release

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds unsigned DMGs for `arm64` + `x64` and uploads them to the GitHub release. The release notes step auto-generates a changelog from `git log` between tags.

## Local dev testing

**Simulate peers** (requires app running in any mode):
```bash
node scripts/fake-peer.js                          # peer at 42%
node scripts/fake-peer.js --battery 8              # triggers low-battery alert
node scripts/fake-peer.js --charging --battery 83  # will cross high-battery threshold
node scripts/fake-peer.js --count 3                # three peers at once
```

**Trigger notch overlay** (requires `npm run dev` — dev server on localhost:41235):
```bash
node scripts/test-notch.js --type low-battery
node scripts/test-notch.js --type charger-request --duration 8000
```
