# Section 08: DevOps & Container Architecture

ParkTwin AI uses multi-container **Docker Compose** topologies for hot-reloading development and scalable production deployments.

---

## Container Architecture

```mermaid
graph TD
    Client[Browser / Client] -->|Port 3000| WebCont["parktwin-web-dev (Next.js 15.5)"]
    Client -->|Port 8000| BackendCont["parktwin-dev (FastAPI & AI Pipeline)"]
    
    WebCont -->|Proxy API Requests| BackendCont
    
    subgraph Host_Filesystem [Host Filesystem Mounts]
        SourceCode["./ (Workspace Root)"]
        Outputs["./backend/outputs/ (Annotated MP4s & CSVs)"]
        Models["./models/ (YOLOv8m & DL Weights)"]
    end
    
    SourceCode -->|Volume Mount| WebCont
    SourceCode -->|Volume Mount| BackendCont
    Outputs -->|Persistent Storage| BackendCont
    Models -->|Cached Model Weights| BackendCont
```

---

## DevOps Reference Documents

| Document | Topic | Description |
| :--- | :--- | :--- |
| [`docker.md`](./docker.md) | Docker Specs | `docker-compose.hotdev.yml` breakdown, commands, and GPU setup |
| [`configuration.md`](./configuration.md) | Environment Config | Complete guide to `.env`, `.env.production`, and tuning knobs |
| [`deployment.md`](./deployment.md) | Production Guide | PostgreSQL migration, Redis EventBus, SSL/TLS with Caddy/Nginx |
