# Development Guide

## Prerequisites

- Node.js 18+
- macOS (the app is macOS-only)

## Setup

```bash
npm install
npm run dev
```

This starts the Electron app in dev mode with hot reload.

---

## Testing on a single Mac

You don't need two devices to test LastPercent. The `scripts/` directory has two helper scripts that simulate peers and notifications locally.

### Simulate peers on the network

`scripts/fake-peer.js` broadcasts fake heartbeats over the same UDP multicast the real app uses. The app will see these as real peers.

```bash
# One peer at 42%
node scripts/fake-peer.js

# Peer with critically low battery (triggers low-battery alert)
node scripts/fake-peer.js --battery 8

# Peer who is charging (Ask button appears on hover)
node scripts/fake-peer.js --charging --battery 60

# Peer that starts at 83% charging — watch for high-battery alert at 85%
node scripts/fake-peer.js --high-battery

# Peer that is hidden (shows "not sharing" in the list)
node scripts/fake-peer.js --hidden

# 3 peers at once
node scripts/fake-peer.js --count 3

# Broadcast every 1s instead of the default 8s
node scripts/fake-peer.js --fast
```

Peers go "away" ~90s after you stop the script (the normal timeout).

---

### Trigger a notch notification

`scripts/test-notch.js` fires a one-shot notch notification directly into the running app. The app must be running in dev mode (`npm run dev`).

```bash
# Low battery alert (default)
node scripts/test-notch.js

# Other alert types
node scripts/test-notch.js --type high-battery
node scripts/test-notch.js --type self-low-battery
node scripts/test-notch.js --type charger-request

# Custom peer details
node scripts/test-notch.js --name "Priya" --emoji 🐙 --battery 7

# Keep it on screen longer (useful for screenshots)
node scripts/test-notch.js --duration 10000
```

> The trigger server (`localhost:41235`) only runs when the app is not packaged. It is never active in production builds.

---

## Building for distribution

```bash
npm run build        # compile only
npm run package      # build + package (no publish)
npm run publish      # build + publish to GitHub Releases
```

Releases are triggered automatically by pushing a version tag:

```bash
npm version patch    # bumps version + creates git tag
git push --follow-tags
```

The GitHub Actions workflow picks up the tag and publishes a signed DMG to GitHub Releases. Users running the app receive an auto-update within 1 hour.
