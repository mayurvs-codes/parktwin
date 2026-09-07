# WebSocket Real-Time Manager (`modules/integration_layer/websocket/`)

Maintains persistent duplex connections with frontend browser clients at `/ws/realtime`.

---

## Connection Lifecycle & Message Broadcasting

```mermaid
sequenceDiagram
    participant UI as Next.js Web Client
    participant WS as WebSocketManager
    participant Bus as EventBus

    UI->>WS: Connect ws://localhost:8000/ws/realtime
    WS->>WS: Register client connection & assign channel
    WS-->>UI: Connected acknowledgment

    loop Event Broadcast Loop
        Bus->>WS: Domain Event (e.g. slot_occupied P03)
        WS->>UI: JSON Frame { type: "SLOT_UPDATE", data: { slot_id: "P03", state: "OCCUPIED" } }
    end

    UI->>WS: Heartbeat Ping
    WS-->>UI: Heartbeat Pong
```
