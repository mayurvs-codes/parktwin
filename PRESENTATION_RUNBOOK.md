# ParkTwin AI — Presentation Runbook

Use this on demo day. It covers how to start the system, the click-by-click demo (about 8 minutes), what is real and what is simulated, what to do if something breaks, and answers to likely examiner questions.

---

## 1. Start the system (15 minutes before)

1. Start **Docker Desktop** and wait until it says *Engine running*.
2. In PowerShell, from the project folder:
   ```powershell
   .\dev.ps1 up
   ```
   This starts the backend on port 8000 and the website on port 3000. The first page load can take about 20 seconds while Next.js compiles.
3. Check that both are up:
   - Backend: <http://localhost:8000/health> returns JSON with `"status":"healthy"`.
   - Website: <http://localhost:3000/dashboard> loads.
4. Use **Chrome or Edge** (the voice uses the browser's built-in speech). Turn the laptop volume up.
5. Open four tabs:

   | Tab | URL | Used for |
   |---|---|---|
   | 1 | <http://localhost:3000/dashboard> | Opening overview |
   | 2 | <http://localhost:3000/user/dashboard> | Driver portal (voice, wrong-bay warning) |
   | 3 | <http://localhost:3000/digital-twin> | Admin digital twin (2D map, alerts) |
| 3b | <http://localhost:3000/digital-twin-3d> | Separate full 3D model of the facility (orbit, zoom, fly to a free bay) |
   | 4 | <http://localhost:3000/video-processing> | CCTV architecture (16 cameras, honest labels) |

6. In **Tab 2**, click **Reset** (top right). This clears the browser demo state *and* the backend episodes and voice log.

> Do not edit code while presenting. The backend reloads on file changes and forgets in-memory episodes.

---

## 2. Demo script (~8 minutes)

### Step 1 — Overview (Tab 1, 30 s)
- Point at the **Demo Mode · Replay Data** badge: "Everything you see is driven by recorded footage or a labelled simulation; we never present it as live CCTV."
- Show the totals: 60 physical stalls from the B2 floor plan; occupancy from the demo scenario.

### Step 2 — Digital twin in 2D and 3D (Tab 3, 1 min)
- Show the 2D floor-plan twin. Click a parked car: the inspector shows the vehicle and its assigned space.
- Click **3D** in the view switch. The same facility, same selection, same occupancy.
- Click **2D** to go back. "Both views read one shared geometry file, `shared/facility_geometry.json`, which also feeds the backend's navigation graph."

### Step 3 — Driver guidance with voice (Tab 2, 1 min)
- Click **Enable Voice** (browsers require one click before audio).
- The assignment is spoken as one short line: "Verification successful. Welcome User A. Your place is C7." Point at the **Announcement log** (each entry is labelled `demo`). Bays are named by row letter and number (A1–A13, B1–B4, C1–C8 …); the same names appear on the 2D twin, the 3D model and in the voice.
- Optional: click **NAVIGATE TO SP-07** to show the route on the map.

### Step 4 — Early wrong-bay warning (Tab 2, 1.5 min) — the key feature
- Click **Simulate Wrong Space** (works for User A, User B and Guest). Timeline from the moment the car parks:
  - **0 s** the twin shows the violation.
  - **2 s** the driver gets a call (an *Incoming call* banner plus spoken warning and directions to their own bay).
  - **7 s** (5 s after the call) if the car has not moved, the admin sees an **Admin notification** banner on every admin page and a *VEHICLE NOT MOVED* card on the digital twin. Moving the car or clicking **Clear Violation** before then cancels it.
- What happens behind the button: the backend drives a *simulated* vehicle path (floor-plan metres) into SP-11 through the **real** bay-entry detector. The detector confirms entry once ≥35 % of the car is inside the bay for 0.8 s, which is *before* the car is fully parked. The violation engine opens an episode and the voice service speaks:
  > "Warning! This is not your designated parking space. Please move to space C7. Back out into the aisle, turn right, and drive about 12 metres. Bay C7 will be on your left."
- Point at the **Wrong Space Warning** card: expected SP-07, actual SP-11, dwell timer running.

### Step 5 — 8-minute and 10-minute rules (Tabs 2 and 3, 1.5 min)
- In the warning card, use **Demo Time Acceleration**: click **8m (Warn)**. Switch to Tab 3: the admin twin shows **GRACE PERIOD ENDING (8:00+)**.
- Back in Tab 2, click **10m (Alert)**. Tab 3 now shows **PARKING VIOLATION** with vehicle, expected SP-07, actual SP-11, 10:00+, ACTION REQUIRED.
- Say: "The acceleration buttons move the backend's episode clock; in normal running a background clock checks every 5 seconds and fires the same events at real 8 and 10 minutes."

### Step 6 — Driver corrects the mistake (Tab 2, 45 s)
- Click **MOVE TO SP-07 (FRESH TIMER)**. The simulated vehicle backs out of SP-11 and enters SP-07 through the detector.
- The warning clears, SP-11 is freed, a new session starts at 00:00, and the backend marks the episode **RESOLVED (left_bay)**. No escalation can follow.

### Step 7 — Honesty about cameras (Tab 4, 45 s)
- CAM-01 to CAM-03 show **REPLAY** (recorded clips). CAM-04 to CAM-16 show **MAPPING UNVERIFIED**. "No camera is labelled live, and none is floor-calibrated yet."

### Step 8 — Close (30 s)
- "The full journey is covered by 20 automated browser tests that drive this same running system: 19 pass and one is blocked because the web app has no login yet."
- Click **Reset** in Tab 2 before handing over.

---

## 3. What is real and what is simulated

| Part | Status |
|---|---|
| Bay-entry detection logic (overlap, 0.8 s confirmation, direction, speed, exit hysteresis) | **Real code**, exercised live in the demo |
| Wrong-bay episode, 8-minute warning, 10-minute escalation, resolution on leaving/relocating | **Real backend logic** (`ViolationEngine`) |
| Voice text (assignment, warning, failures) and duplicate suppression | **Real backend** (`VoiceService`), spoken by the browser |
| Vehicle positions in the wrong-bay demo | **Simulated** path in floor-plan metres, labelled `source="demo"` |
| 8/10-minute jumps during the demo | **Test hook** that moves the episode clock (disabled outside development) |
| Detection on real CCTV | Works in **replay** on one recorded clip with approximate image-space bay regions; **no measured accuracy** yet |
| Live camera detection | **Not demonstrated**: no camera is floor-calibrated |
| Authorised-bay long-stay alert | Computed in the browser demo; the backend proves no wrong-bay episode opens |
| Login / user roles | **Not built** |

---

## 4. If something goes wrong

| Problem | Fix |
|---|---|
| Website shows an error page | Wait 20 s and refresh (Next.js is compiling). If it persists: `docker compose -f docker/compose/docker-compose.hotdev.yml restart frontend` |
| No voice | Click **Enable Voice** again; check laptop volume; use Chrome/Edge |
| Warning doesn't appear after **Simulate Wrong Space** | Click **Reset**, wait 2 s, try again (the backend may have reloaded) |
| Screens disagree with each other | Click **Reset** in Tab 2, then refresh Tabs 1 and 3 |
| Backend down | `.\dev.ps1 restart`, then check <http://localhost:8000/health> |
| Docker Desktop won't start (engine never comes up) | Run without Docker, in two terminals from the project folder (see below) |

### Running without Docker

Same code, same ports. Stop any Docker containers first so ports 8000 and 3000 are free. When Docker is back, close these two terminals first (a local server on port 3000 stops the web container publishing its port), then run `.\dev.ps1 up`.

```powershell
# Terminal 1 — backend on :8000
python -m uvicorn backend.app.app:app --host 127.0.0.1 --port 8000
```

```powershell
# Terminal 2 — website on :3000
cd apps/web; npx next dev -p 3000
```

The browser test suite runs against this setup too (B19 runs the `monday` scenario locally when Docker is unavailable).

---

## 5. Likely examiner questions

**Is the wrong-bay detection real or scripted?**
The detection logic is real and runs on every demo click. The vehicle *positions* are simulated because no camera is floor-calibrated yet. On recorded CCTV the same detector runs in replay mode with approximate image regions, but we have not measured its accuracy, because that needs hand-labelled ground truth.

**How do you tell entering a bay from driving past it?**
The car's footprint must overlap the bay by at least 35 % for 0.8 s, moving towards the bay below 5 m/s. A car driving along the aisle never reaches the overlap. Test B06 checks this.

**Why warn before the car is parked?**
To give the driver a chance to correct the mistake without stopping. The warning fires at "entry confirmed"; "occupied" needs 70 % overlap. Test B05 checks the order from the backend.

**What stops repeated announcements?**
Every voice message carries an event id. The backend and the browser both drop repeats, and there is a per-vehicle cooldown. Test B12 sends the same event 20 times: one log entry, one `speak()` call.

**What happens if the driver moves or leaves before 10 minutes?**
The episode is resolved and its timer is discarded. Moving to the assigned bay starts a fresh session at 00:00. Tests B09 and B10 cover this.

**What would it take to run on live cameras?**
Four or more surveyed reference points per camera (pixel to floor-plan metres), listed in `docs/CALIBRATION_REQUEST.md`, plus hand-labelled clips to measure accuracy.

---

## 6. Re-running the evidence

```powershell
# Backend unit + integration tests
python -m pytest tests -q

# Browser acceptance suite (needs the Docker stack running)
cd apps/web; npx playwright test e2e/B
```

Reports, screenshots, videos and traces are written to `docs/evidence/3d-voice-violation/e2e/`. See `docs/evidence/3d-voice-violation/BROWSER_ACCEPTANCE_REPORT.md` for the results table.
