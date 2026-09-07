# Docker Architecture & Operations (`docker/`)

---

## Service Specifications (`docker/compose/docker-compose.hotdev.yml`)

### 1. `parktwin-dev` (Backend Service)
- **Base Image**: Python 3.11 Slim with OpenCV, PyTorch, PaddleOCR, EasyOCR.
- **Port Mapping**: `8000:8000`
- **Volume Mounts**:
  - `../../:/app` (hot-code reloading).
  - `../../backend/outputs:/app/backend/outputs` (persistent outputs).
- **Health Check**: `curl -f http://localhost:8000/health`

### 2. `parktwin-web-dev` (Frontend Service)
- **Base Image**: Node.js 20 Alpine.
- **Port Mapping**: `3000:3000`
- **Command**: `npm run dev`

---

## Container Operations Quick Reference

```powershell
# 1. Start all services in background
docker compose -f docker/compose/docker-compose.hotdev.yml up -d

# 2. View live backend logs
docker logs -f parktwin-dev

# 3. View live frontend logs
docker logs -f parktwin-web-dev

# 4. Restart backend after configuration changes
docker restart parktwin-dev

# 5. Run full test suite inside container
docker exec parktwin-dev pytest tests/ -q
```

---

## NVIDIA GPU Passthrough Guide

To enable CUDA GPU acceleration in Docker:
1. Install **NVIDIA Container Toolkit**.
2. Add the `deploy.resources.reservations.devices` block to `docker-compose.hotdev.yml`:
```yaml
services:
  parktwin-dev:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```
