# Contributing to LastPercent

Thanks for your interest. LastPercent is a small, focused codebase — contributions are welcome but the goal is to keep it that way.

---

## Setup

```bash
git clone https://github.com/mdsaban/lastpercent
cd lastpercent
npm install
npm run dev
```

You'll see `⚡` in your menu bar. Click it.

**Requirements:** Node.js 20+, macOS 12+

---

## Project structure

```
src/
  main/              Electron main process (Node.js)
    services/        Battery, state, persistence, network name
    network/         Discovery (mDNS), Gossip (UDP), DirectChannel (WS)
    windows/         BrowserWindow wrappers (dropdown, notch, settings)
    ipc/             IPC handler registration
  preload/           contextBridge API surface
  renderer/          React UI
    views/           Dropdown, Settings, NotchAlert
    components/      PeerRow, BatteryBar, Toggle, EmojiPicker
    hooks/           usePeers
  shared/            Types and constants shared across all processes
```

See [PROTOCOL.md](PROTOCOL.md) for the wire format between peers.

---

## Key rules

**Don't break the protocol without bumping `v`.**
Other people's apps on the same LAN will be talking to yours. A malformed payload silently drops (by design) but a schema change without a version bump will cause silent data loss.

**No cloud dependencies.**
The value of the app is that it works without internet. PRs that introduce any server-side component won't be merged.

**Keep the types honest.**
All wire messages go through Zod validation in `src/main/network/protocol.ts`. If you add a field, add it to the schema.

**Run typecheck before opening a PR.**
```bash
npm run typecheck
npm run build
```
CI runs both of these. A PR that fails either won't be merged.

---

## What's welcome

- Bug fixes
- macOS version compatibility fixes
- Better mDNS reliability across different network configurations
- UI polish that respects the existing design tokens (`src/renderer/styles/globals.css`)
- Documentation improvements

## What to discuss first (open an issue)

- New features that add UI surface area
- Protocol changes
- New dependencies
- Changes to the privacy model

---

## Code style

- TypeScript strict mode — no `any` except where unavoidable (mark with a comment)
- No comments explaining *what* the code does — only *why* (hidden constraints, non-obvious invariants)
- Prefer editing existing files over creating new ones
- No premature abstraction — three similar lines is fine

---

## License

By contributing, you agree your code is released under the project's [MIT License](LICENSE).
