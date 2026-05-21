# LastPercent Protocol v1

All messages are JSON over UTF-8. Maximum payload size: 1400 bytes (UDP safe limit).

All messages include:
- `type` — string discriminant
- `v` — schema version (integer, currently `1`)

---

## Transport layers

| Layer | Protocol | Address | Direction |
|---|---|---|---|
| Discovery | mDNS (`_lastpercent._udp.local`) | LAN multicast | Broadcast |
| Heartbeat | UDP multicast | `239.255.42.99:41234` | Broadcast |
| Direct messages | WebSocket (TCP) | Peer IP:`41235` | Point-to-point |

---

## Messages

### `heartbeat` (UDP multicast, every 10s)

Sent by every visible peer on a 10-second timer and immediately on state change.
Receivers update their local `PeerRegistry`. Stale packets (older `lastUpdatedAt` than what's stored) are silently dropped.

```json
{
  "type": "heartbeat",
  "v": 1,
  "peerId": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "Saban",
  "emoji": "⚡️",
  "battery": 42,
  "isCharging": false,
  "isPluggedIn": false,
  "hasCharger": true,
  "status": "available",
  "lastUpdatedAt": 1747600000000,
  "appVersion": "0.1.0"
}
```

| Field | Type | Notes |
|---|---|---|
| `peerId` | UUID v4 | Generated once, persisted. Never changes for a device. |
| `status` | enum | `available` \| `away` \| `dnd` |
| `lastUpdatedAt` | unix ms | Set by sender. Used for ordering, not trust. |

---

### `goodbye` (UDP multicast, on quit/sleep)

Sent when the app quits, sleeps, or the user toggles visibility off.
Receivers immediately remove the peer from their list.

```json
{
  "type": "goodbye",
  "v": 1,
  "peerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### `charger_request` (WebSocket, point-to-point)

Sent from requester → charger holder.

```json
{
  "type": "charger_request",
  "v": 1,
  "requestId": "req_1747600000000",
  "from": {
    "peerId": "...",
    "displayName": "Saban",
    "emoji": "⚡️",
    "battery": 8
  },
  "message": "🪫 dying, can I borrow?",
  "sentAt": 1747600000000
}
```

---

### `charger_response` (WebSocket, point-to-point)

Sent from charger holder → requester.

```json
{
  "type": "charger_response",
  "v": 1,
  "requestId": "req_1747600000000",
  "accepted": true,
  "note": "On my way",
  "respondedAt": 1747600005000
}
```

---

## Peer lifecycle

```
start app
  → publish mDNS service
  → join multicast group
  → broadcast heartbeat immediately (1s delay)
  → broadcast every 10s

sleep / quit / go invisible
  → send goodbye
  → leave multicast

wake / become visible
  → re-publish mDNS
  → force heartbeat broadcast
```

**Stale peer pruning (receiver-side):**

| Time since last heartbeat | Action |
|---|---|
| > 90s | Mark peer `status: "away"` |
| > 10 min | Remove peer entirely |

---

## Versioning

The `v` field is reserved for protocol evolution. Breaking changes bump `v`. Receivers that receive a message with an unknown `v` should silently drop it. Current version: `1`.
