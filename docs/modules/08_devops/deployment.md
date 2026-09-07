# Production Deployment Guide

---

## Architecture Transformation: Dev to Production

```mermaid
graph TD
    subgraph Development [Development Setup]
        DevDB[SQLite WAL Mode]
        DevBus[In-Memory Asyncio Queue]
        DevStatic[Static Dev Token]
    end

    subgraph Production [Production Enterprise Deployment]
        ProdDB[(PostgreSQL 16 High Availability)]
        ProdBus[Redis 7 Cluster EventBus]
        ProdAuth[OAuth2 / JWT Token Authority]
        Proxy[Caddy / Nginx Reverse Proxy with Auto HTTPS]
    end

    Proxy --> ProdDB & ProdBus & ProdAuth
```

---

## Production Checklist

1. **Database Migration**: Switch `DATABASE_URL` from `sqlite:///./data/parktwin.db` to `postgresql://user:pass@host:5432/parktwin`.
2. **Event Bus**: Set `EVENT_BUS_TYPE=redis` and configure `REDIS_URL=redis://host:6379/0`.
3. **Security**: Generate a 256-bit cryptographically secure `JWT_SECRET_KEY`.
4. **SSL / Reverse Proxy**: Deploy Caddy with automatic Let's Encrypt certificates.
