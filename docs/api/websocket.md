# WebSocket — `/integration/ws` (Module 3)

Live updates over a single WebSocket endpoint. The router only *transports*
messages; the `ConnectionManager` and `IntegrationService` decide what to
broadcast and to which channel. No authentication.

Defined in `modules/integration_layer/websocket/router.py`.

## Connect

```
ws://<host>/integration/ws?channel=<channel>
```

| Param | Values | Default |
|-------|--------|---------|
| `channel` | `vehicles` \| `occupancy` \| `sessions` \| `events` | `events` |

Example: `ws://localhost:8000/integration/ws?channel=occupancy`

## Behaviour

- The connection stays open and receives JSON push messages for the subscribed
  channel.
- Client-sent text frames are treated as **heartbeats** and ignored.
- On disconnect, the manager removes the subscriber from the channel.
- Messages are **full snapshots** for the channel (occupancy/session/event),
  not per-entity diffs. The frontend uses each message as a *live nudge* that
  invalidates its polling queries, which then re-read the authoritative
  gateway snapshot.

## Frontend usage

`apps/web` provides `hooks/useParkingWebSocket.ts`, which connects to the
`occupancy` + `sessions` channels, auto-reconnects with a **capped exponential
backoff** (3 s → 15 s max), and invalidates the polling queries on each message.
Live Parking polls the gateway at `refetchInterval = 5000ms` as the authoritative
path; the WebSocket is the live nudge.

## Notes

- Add a per-slot channel only by extending the backend (it does not exist today).
- For production/external exposure, add a token query param + origin check (see
  [Security](../../SECURITY.md)).
- Behind a reverse proxy, ensure `Upgrade`/`Connection` headers and a generous
  read timeout are forwarded (see
  [Reverse proxy](../deployment/reverse-proxy.md)).
