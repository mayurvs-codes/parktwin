# Section 06: Integration Layer & Real-Time Event Bus

The **Integration Layer** (`modules/integration_layer/`) decouples low-level computer vision processing from high-level API routers, WebSockets, and external microservices.

---

## Topology

```mermaid
graph TD
    AI[AI Inference Pipeline] --> PI[Parking Intelligence]
    
    PI --> EB[events/bus.py<br>EventBus Interface]
    EB --> MB[events/memory_bus.py<br>Asyncio In-Process Bus]
    EB --> RB[events/redis_bus.py<br>Distributed Redis Pub/Sub]
    
    EB --> WS[websocket/manager.py<br>WebSocket Real-Time Broadcast]
    WS --> Client[Next.js Frontend /ws/realtime]
    
    EB --> Adapters[adapters/ Transform Engine]
    Adapters --> VA[vehicle_adapter.py]
    Adapters --> PA[parking_adapter.py]
    Adapters --> EA[event_adapter.py]
    
    Adapters --> GW[gateway/router.py<br>Cached REST API Endpoints]
```

---

## Directory Reference

| Document | Component | Description |
| :--- | :--- | :--- |
| [`event_bus.md`](./event_bus.md) | `events/` | Pub/Sub messaging bus with Memory and Redis backends |
| [`websocket.md`](./websocket.md) | `websocket/` | Real-time WebSocket connection manager and multiplexed broadcasting |
| [`adapters.md`](./adapters.md) | `adapters/` | Domain entity to API DTO transformation layer |
| [`gateway.md`](./gateway.md) | `gateway/` | Unified caching REST integration gateway endpoints |
