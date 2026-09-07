# State Management & WebSockets (`apps/web/store/`)

ParkTwin AI utilizes **Zustand** for lightweight, performant global state management.

---

## Store Architecture

```mermaid
graph TD
    WS[/ws/realtime WebSocket Feed] --> Hook[useWebSocket Hook]
    Hook --> Dispatch{Message Type}
    
    Dispatch -->|SLOT_UPDATE| PStore[useParkingStore<br>Slot States & Occupancy Rate]
    Dispatch -->|VEHICLE_DETECTED| VStore[useVehicleStore<br>Recent Vehicle Feed]
    Dispatch -->|SYSTEM_ALERT| AStore[useAlertStore<br>Violations & Notifications]
    
    PStore --> UI1[Dashboard Slot Grid]
    PStore --> UI2[3D Digital Twin]
    VStore --> UI3[Vehicles Table]
```
