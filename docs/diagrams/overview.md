# Diagrams

Mermaid diagrams for ParkTwin AI. They render on GitHub and in most Markdown
viewers. The authoritative text descriptions live in
[`PROJECT_MEMORY.md`](../../PROJECT_MEMORY.md) and
[`docs/architecture/architecture.md`](../../docs/architecture/architecture.md).

1. [Overall Architecture](#1-overall-architecture)
2. [Backend Modules](#2-backend-modules)
3. [Frontend Modules](#3-frontend-modules)
4. [Data Flow](#4-data-flow)
5. [Vehicle Processing Pipeline](#5-vehicle-processing-pipeline)
6. [Analytics Flow](#6-analytics-flow)
7. [Reporting Flow](#7-reporting-flow)

---

## 1. Overall Architecture

```mermaid
flowchart TB
    subgraph Input["Input"]
        CAM[CCTV / RTSP / USB / Video file]
    end

    subgraph BE["Backend (FastAPI)"]
        M1["M1 vehicle_recognition"]
        M2["M2 parking_intelligence"]
        M3["M3 integration_layer"]
        M4["M4 analytics"]
        M5["M5 reporting"]
        ENGINE["engine (pipeline)"]
    end

    subgraph FE["Frontend (apps/web, Next.js)"]
        DASH[Dashboard]
        LIVE[Live Parking]
        VEH[Vehicles]
        ANA[Analytics]
        REP[Reports]
    end

    CAM --> ENGINE --> M1 --> M2 --> M3 --> M4 --> M5
    M3 -->|REST /integration/*| FE
    M4 -->|/analytics/*| FE
    M5 -->|/reports/*| FE
    M3 -->|WS /integration/ws| FE
```

---

## 2. Backend Modules

```mermaid
flowchart LR
    shared["shared<br/>(logging, validators)"]
    backend["backend<br/>(config, db, schemas, DI)"]
    engine["engine<br/>(pipeline)"]
    M1["M1 vehicle_recognition"]
    M2["M2 parking_intelligence"]
    M3["M3 integration_layer"]
    M4["M4 analytics"]
    M5["M5 reporting"]

    shared --> backend
    backend --> engine
    engine --> M1
    M1 --> M2
    M2 --> M3
    M3 --> M4
    M4 --> M5
    M3 -.integration_client.-> M4
    M3 -.integration_client.-> M5
    M4 -.integration_client.-> M5
```

---

## 3. Frontend Modules

```mermaid
flowchart TB
    subgraph App["apps/web (Next.js 15 / React 19)"]
        PROV["Providers<br/>Theme + Query"]
        SHELL["AppShell<br/>Sidebar + TopNav"]
        subgraph Views["Views"]
            DASH[Dashboard]
            LIVE[Live Parking]
            VEH[Vehicles]
            ANA[Analytics]
            REP[Reports]
            SET[Settings *placeholder*]
        end
        SVC["services/* (typed Axios)"]
        HOOK["hooks/* (TanStack Query)"]
        TYP["types/* (DTO projections)"]
    end

    API["Backend /integration · /analytics · /reports"]
    WS["Backend /integration/ws"]

    PROV --> SHELL --> Views
    Views --> SVC --> API
    Views --> HOOK --> SVC
    SVC --> TYP
    WS --> HOOK
```

---

## 4. Data Flow

```mermaid
sequenceDiagram
    participant Cam as Camera/Upload
    participant Eng as Engine (M1)
    participant M2 as Parking (M2)
    participant M3 as Integration (M3)
    participant Bus as Event Bus
    participant WS as WebSocket
    participant FE as Frontend

    Cam->>Eng: frame
    Eng->>M2: VehicleRecord → ingest_frame
    M2->>M3: handle_frame (events, occupancy, sessions)
    M3->>Bus: publish IntegrationEvent
    M3->>WS: broadcast snapshot
    WS->>FE: live update (nudge)
    FE->>M3: poll /integration/* (REST)
    M2->>M3: occupancy / sessions / stats
    M3-->>FE: JSON (Gateway DTOs)
```

---

## 5. Vehicle Processing Pipeline

```mermaid
flowchart LR
    FRAME["Frame / Image"] --> DET["Detection<br/>(YOLO)"]
    DET --> TRK["Tracking<br/>(ByteTrack)"]
    TRK --> CLS["Classification<br/>(type/brand/color)"]
    CLS --> PLT["Plate Detection"]
    PLT --> OCR["OCR<br/>(PaddleOCR + EasyOCR)"]
    OCR --> FUS["Fusion / Format"]
    FUS --> SNAP["Snapshot"]
    SNAP --> STORE["M1 storage (parktwin.db)"]
    FUS --> M2["M2 ingest_frame<br/>(SlotAssignment)"]
```

---

## 6. Analytics Flow

```mermaid
flowchart TB
    M3["Integration Layer (M3)"] -->|Integration DTOs| M4["Analytics Service (M4)"]
    M4 --> OCC["occupancy / traffic / utilization / trends"]
    OCC --> STORE["AnalyticsStore (analytics.db)"]
    OCC --> AEP["GET /analytics/*"]
    AEP --> FE["Frontend Analytics view"]

    subgraph Rule["Ownership rule"]
        M2src["M2 = single source of occupancy"]
    end
    M2src -.-> OCC
```

---

## 7. Reporting Flow

```mermaid
flowchart TB
    M3["Integration Layer (M3)"] --> M4["Analytics (M4)"]
    M3 --> M5["Reporting Service (M5)"]
    M4 --> M5
    M5 --> GEN["Generator<br/>(by report_type)"]
    GEN --> TPL["Template"]
    TPL --> EXP["Exporter (json/csv/pdf)"]
    EXP --> RSTORE["ReportStore (reports.db)"]
    EXP --> OUT["reports_output/"]
    RSTORE --> REP["GET /reports/*"]
    REP --> FE["Frontend Reports view"]
```
