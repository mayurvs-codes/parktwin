# ParkTwin AI — Phase 0 Baseline Report

**Date:** 2026-10-19  
**Branch:** `feat/3d-voice-violation` (off `prototype-3day`)  
**Checkpoint commit:** `chore: checkpoint existing prototype work + add .gitattributes for LF normalisation`

---

## 1. Baseline Test Results

### 1.1 Backend — pytest

```
python -m pytest tests -q
```

| Result | Count |
|--------|-------|
| Passed | 253 |
| Skipped | 2 |
| Failed | 0 |
| Warnings | 2 (urllib3 version mismatch, ccache not found — unrelated) |

Duration: ~60 seconds  
**Status: ✅ GREEN**

Test files verified passing:
- `tests/unit/test_duration.py`
- `tests/unit/test_violations.py`
- `tests/unit/test_navigation.py`
- `tests/unit/test_vehicle_navigation.py`
- `tests/unit/test_journey.py`
- `tests/unit/test_slot_mapper.py`
- `tests/unit/test_slot_websocket.py`
- `tests/unit/test_camera_designation.py`

### 1.2 Frontend — vitest

```
npm --prefix apps/web run test
```

| Result | Count |
|--------|-------|
| Test Files | 30 passed |
| Tests | 243 passed |

Duration: ~52 seconds  
**Status: ✅ GREEN**

### 1.3 Frontend — ESLint

```
npm --prefix apps/web run lint
```

Result: `✔ No ESLint warnings or errors`  
**Status: ✅ GREEN**

(Note: `next lint` deprecation warning for Next.js 16 is informational only.)

### 1.4 Frontend — TypeScript

```
node apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
```

Result: Exit code 0, no output (no errors)  
**Status: ✅ GREEN**

### 1.5 Application Health

All three servers start successfully:
- Backend FastAPI: `http://localhost:8000` — HTTP 200
- Frontend Next.js: `http://localhost:3000` — HTTP 200
- Proxy: `http://localhost:3001` — HTTP 200

Routes verified:
- `http://localhost:3001/dashboard` — ✅
- `http://localhost:3001/digital-twin` — ✅
- `http://localhost:3001/3d-zone` — ✅ (active route, renders ParkingZone3D)
- `http://localhost:3001/user/dashboard` — ✅

---

## 2. Summary

All baseline checks pass. No new failures may be introduced in subsequent phases without documentation and justification.
