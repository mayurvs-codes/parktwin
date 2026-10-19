# ParkTwin AI — 14-Step 3D Twin, Voice & Wrong-Bay Demonstration Script
==========================================================================

**Document:** `DEMO_SCRIPT_3D_VOICE.md`  
**Purpose:** Standard operating procedure for verifying the unified 3D twin, voice guidance, and wrong-bay violation engine end-to-end.  
**Provenance Notice:** Steps involving simulated vehicles are explicitly tagged `[SIMULATION / REPLAY]`. System components, WebSocket streams, and 3D rendering are `[LIVE RUNTIME]`.

---

## Prerequisites
1. Backend running at `http://localhost:8000`
2. Web Frontend running at `http://localhost:3001`
3. Two browser tabs open:
   - **Tab 1 (Driver Portal):** `http://localhost:3001/user/dashboard`
   - **Tab 2 (Admin Digital Twin):** `http://localhost:3001/digital-twin`

---

## 14-Step End-to-End Walkthrough

### Step 1: System Reset & Baseline Verification `[LIVE RUNTIME]`
- Click the **Reset** button in either the Admin Twin or Driver Portal.
- Confirm the dialog: *"Reset all Digital Twin and parking session states?"*
- **Expected Outcome:** Baseline is restored across both tabs:
  - 20 bays total in focused zone: **15 Occupied**, **4 Available**, **1 Designated (SP-07)**.
  - Zero active violations; status badge displays `DEMO / LIVE`.

### Step 2: Driver Portal Initialization `[LIVE RUNTIME]`
- On Tab 1 (`/user/dashboard`), observe the Driver Action Panel.
- **Expected Outcome:** The **AUDIO GUIDANCE** card is visible. Because browser autoplay audio is protected, the voice button displays `ENABLE VOICE` with an amber pulse indicator.

### Step 3: Audio Guidance Unlock `[USER ACTION]`
- Click the **Enable Voice** button on the Audio Guidance card.
- **Expected Outcome:** Browser speech synthesis unlocks. Badge changes to `VOICE ACTIVE` (emerald). The system status chip in the top status bar displays `VOICE ON 🔊`.

### Step 4: Vehicle Approach at Entrance Gate `[SIMULATION / REPLAY]`
- Driver persona User A approaches B2 Access Point (`ACCESS_POINT_B2`) covered by `CAM-01`.
- ANPR capture triggers plate reading for `KA01MJ5001` (`VEH-001`).

### Step 5: Vehicle Assignment `[LIVE RUNTIME]`
- Backend assigns designated space `SP-07` based on registered employee profile.
- Routing service computes shortest path from `ACCESS_POINT_B2` to `SP-07` via `NORTH_JUNCTION`.

### Step 6: Dynamic Voice Announcement `[LIVE RUNTIME]`
- Spoken audio plays through device speakers:
  > *"Vehicle recognised. Your designated parking space is SP-07. Follow the driving aisle to your bay."*
- Text is displayed verbatim on the Driver Action Panel for visual accessibility.

### Step 7: Dual 2D & 3D Navigation Route Display `[LIVE RUNTIME]`
- Switch to Tab 2 (`/digital-twin`).
- Toggle between **2D Vector** and **3D Twin** using the view switcher.
- **Expected Outcome:**
  - In 2D: Green navigation polyline connects the entrance to bay SP-07.
  - In 3D: Cyan 3D route ribbon leads along the drive aisle directly into the 3D parking bay mesh.
  - Selection and occupancy counts remain 100% synchronized across 2D and 3D.

### Step 8: Drive-Past Aisle Discrimination `[SIMULATION / REPLAY]`
- Vehicle moves along the central driving aisle at $6\text{ m/s}$ past bays SP-01 to SP-06.
- **Expected Outcome:** The kinematic filter in `BayEntryDetector` observes perpendicular velocity and speeds exceeding the entry threshold. **NO false entry events are triggered.**

### Step 9: Wrong-Bay Entry Detection `[SIMULATION / REPLAY]`
- The driver veers off-course and turns into bay `SP-11` instead of assigned `SP-07`.
- When footprint overlap exceeds $35\%$ sustained for $800\text{ms}$, `BayEntryDetector` emits `BAY_ENTRY_CONFIRMED` for `SP-11`.

### Step 10: Immediate Violation Warning `[LIVE RUNTIME]`
- `ViolationEngine` detects `actual_bay (SP-11) != assigned_bay (SP-07)`.
- Opens a violation episode (`state: WARNED`) and emits `WRONG_BAY_ENTRY_WARNING`.
- **Expected Outcome:**
  - Tab 1 displays rose-bordered **Wrong Space Warning** banner showing Expected: `SP-07`, Actual: `SP-11`.
  - Dwell timer begins counting up from `00:00:00`.
  - Tab 2 (Admin Twin) highlights bay `SP-11` in violation rose.

### Step 11: Spoken Warning Dispatch `[LIVE RUNTIME]`
- High-priority voice announcement immediately sounds:
  > *"Warning! This is not your designated parking space. Please move to space SP-07."*
- Duplicate frames are suppressed; warning is spoken exactly once.

### Step 12: Vehicle Departure & Episode Resolution `[SIMULATION / REPLAY]`
- Driver heeds warning, reverses out of `SP-11`.
- Footprint overlap drops below $15\%$; detector emits `BAY_EXIT_CONFIRMED`.
- `ViolationEngine` marks episode as `RESOLVED` with `reason: left_bay`.
- **Expected Outcome:** The dwell timer stops at the departure timestamp; because departure occurred before $600\text{s}$ (10 minutes), **no escalation alert is dispatched to Admin**.

### Step 13: Relocation to Assigned Space `[SIMULATION / REPLAY]`
- Vehicle drives to assigned bay `SP-07` and parks.
- Footprint settles inside bay; detector emits `BAY_OCCUPIED`.
- **Expected Outcome:**
  - Tab 1 shows normal green active parking session.
  - New session duration timer starts cleanly from `00:00:00` without any carryover from the wrong bay.

### Step 14: Final Admin Twin Verification `[LIVE RUNTIME]`
- On Tab 2 (`/digital-twin`), observe final facility state:
  - `SP-07`: Marked **Occupied** (active session).
  - `SP-11`: Restored to **Available / Free**.
  - Announcement audit log records: 1 Assignment, 1 Warning, 1 Resolution.
  - Zero unhandled exceptions or competing state.
