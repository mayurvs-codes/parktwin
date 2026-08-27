# ParkTwin AI — Developer Quickstart

> **Problem solved:** No more full rebuilds every session.  
> ML models download **once**. Code changes reflect **instantly**.  
> The database persists between restarts.

---

## The One-Time Setup (15–40 minutes, done ONCE forever)

Open PowerShell in the project root and run:

```powershell
.\dev.ps1 build
```

This builds the Docker image and downloads all ML weights (torch, PaddleOCR, YOLOv8).  
**This only ever runs once.** After that, starting takes seconds.

---

## Daily Workflow

### Start the backend (for API / module development)
```powershell
.\dev.ps1 backend
```
→ Backend starts in **~5 seconds**. Available at http://localhost:8000/docs

### Start everything (backend + frontend)
```powershell
.\dev.ps1 up
```
→ Backend at http://localhost:8000 · Frontend at http://localhost:3000

### Make code changes
Just edit files in `backend/`, `modules/`, `engine/`, `shared/`, or `apps/web/`.  
**Changes apply automatically** — uvicorn reloads in ~1 second, Next.js hot-reloads in ~1 second.  
**No docker command needed.**

### Run tests (no rebuild, no restart)
```powershell
.\dev.ps1 test                                    # full suite (201 tests)
.\dev.ps1 test tests/unit/test_calculators.py     # specific file
.\dev.ps1 test tests/integration/                 # integration tests only
```

### Stop for the day
```powershell
.\dev.ps1 stop
```
→ Containers stop. **Database, models, and logs are all kept.** Next `.\dev.ps1 up` is instant.

---

## All Commands

| Command | What it does | Speed |
|---------|-------------|-------|
| `.\dev.ps1 backend` | Start backend only | ~5 sec |
| `.\dev.ps1 up` | Start backend + frontend | ~10 sec |
| `.\dev.ps1 stop` | Stop (keep all data) | instant |
| `.\dev.ps1 restart` | Stop + start | ~10 sec |
| `.\dev.ps1 logs` | Tail live logs | instant |
| `.\dev.ps1 shell` | Bash inside container | instant |
| `.\dev.ps1 test` | Run pytest | no rebuild |
| `.\dev.ps1 test <path>` | Run specific test | no rebuild |
| `.\dev.ps1 db` | SQLite shell on live DB | instant |
| `.\dev.ps1 health` | Check API health endpoints | instant |
| `.\dev.ps1 status` | Container + volume status | instant |
| `.\dev.ps1 build` | **First-time build only** | 15–40 min |
| `.\dev.ps1 rebuild` | Rebuild after dep changes | 15–40 min |
| `.\dev.ps1 clean` | Remove containers, keep data | instant |
| `.\dev.ps1 wipe` | Full wipe (asks confirmation) | instant |

---

## When Do You Need to Rebuild?

**Never, for normal development.** Code changes hot-reload automatically.

**Rebuild only when:**
- You add or change a Python package in `pyproject.toml`
- You change the `Dockerfile`
- You change `requirements.txt`

```powershell
.\dev.ps1 rebuild   # takes 15-40 min, caches pip packages aggressively
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Your Editor                                            │
│  (edits backend/, modules/, engine/, shared/)           │
└──────────────────┬──────────────────────────────────────┘
                   │  bind mount (instant sync)
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Docker Container: parktwin-dev                         │
│  Image: parktwin-ai/backend:hotdev (built ONCE)         │
│  uvicorn --reload watches the mounted source dirs       │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴───────────────────────┐
        │  Named Volumes (PERSISTENT)      │
        │  parktwin_models   → ML weights  │
        │  parktwin_paddleocr→ OCR models  │
        │  parktwin_db       → SQLite DB   │
        │  parktwin_logs     → Log files   │
        └──────────────────────────────────┘
```

**Named volumes** survive `stop`, `restart`, and `clean`. They are only destroyed by `wipe`.

---

## Troubleshooting

### Container won't start / crashes on boot
```powershell
.\dev.ps1 logs   # see what went wrong
```

### Port 8000 already in use
```powershell
# Find what's using the port
netstat -ano | findstr :8000
# Kill it by PID, then try again
```

### Database locked / corrupted
```powershell
.\dev.ps1 shell
# Inside container:
python -c "from backend.database.session import init_db; import asyncio; asyncio.run(init_db())"
```

### Models downloading again unexpectedly
This means the `parktwin_models` volume was lost. Check:
```powershell
docker volume ls | findstr parktwin
```
If volumes are missing, run `.\dev.ps1 build` again.

### Need a completely clean slate
```powershell
.\dev.ps1 wipe   # destroys everything, need to rebuild from scratch
.\dev.ps1 build
```
