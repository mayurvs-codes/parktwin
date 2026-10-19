# ParkTwin AI — College Demonstration Runbook & Examiner FAQ

## Overview
This runbook provides the exact sequence of actions for presenting ParkTwin AI to examiners and evaluators during the final college demonstration.

---

## 🖥️ Recommended Screen Setup

Open **three browser tabs** side-by-side or arranged on your presentation display:

| Tab | Role | URL | Purpose |
|---|---|---|---|
| **Tab 1** | **Driver Portal (User A)** | `http://localhost:3001/user/dashboard` | Drives vehicle `VEH-001` (Reserved: `SP-24`) |
| **Tab 2** | **Driver Portal (User B)** | `http://localhost:3001/user/dashboard` | Drives vehicle `VEH-002` (Reserved: `SP-14`) or `VEH-003` (No Res) |
| **Tab 3** | **Admin Digital Twin** | `http://localhost:3001/digital-twin` | Facility-wide digital replica & telemetry |

---

## 🎬 Step-by-Step Presentation Script

### Opening: Starting Clean State
1. Focus on **Tab 3 (Admin Digital Twin)**.
2. Click **Reset Movie** (or in Driver Portal click **Reset Demo**).
3. **Show the Examiner**:
   - Total Slots: `60`
   - Occupied Baseline: `20` (canonical background parked vehicles)
   - Available Bays: `40` (including `SP-24` and `SP-14`)
   - All event logs and active sessions are cleared.

---

### Step 1: Demonstrate VEH-001 (Reserved User Flow)
1. Switch to **Tab 1 (User A)**.
2. Ensure `VEH-001` is selected.
3. **Show the Examiner**:
   - **Card 1 (Vehicle Provenance)**: Primary application identity is `VEH-001 (Executive SUV)`.
   - **Card 2 (Reservation Status)**: `RESERVED` for `Space SP-24` (Zone C · Level B2).
   - **Card 3 (Status & Location)**: `Destination: SP-24`.
4. Click **Start Navigation** (or **Next Event**).
5. Advance the navigation steps until the badge shows **`PARKED`** (and route arrives at bay `SP-24`).
6. Click into **Parking Session**:
   - Point out the live duration counter running seamlessly.

---

### Step 2: Show Live Admin Digital Twin Synchronization
1. Switch to **Tab 3 (Admin Digital Twin)** *without refreshing*.
2. **Show the Examiner**:
   - Bay `P24` (`SP-24`) is now highlighted green (`OCCUPIED`).
   - Bay occupant marker reads `VEH-001`.
   - Occupancy KPI incremented from `20` to `21`.
   - Click on bay `P24` or vehicle `VEH-001` to reveal the **Spatial Inspector** on the right.
   - Point out the status: `PARKED` in `SP-24`.

---

### Step 3: Demonstrate Multi-User Concurrency (VEH-002)
1. Switch to **Tab 2 (User B)**.
2. Select vehicle `VEH-002`.
3. **Show the Examiner**:
   - `VEH-002` has an independent reservation in `SP-14` (Zone B · Level B2).
4. Click **Start Navigation** and advance to **`PARKED`**.
5. Switch back to **Tab 3 (Admin Digital Twin)**:
   - Point out that **both** `VEH-001 (SP-24)` and `VEH-002 (SP-14)` are concurrently occupied.
   - Occupancy KPI is now `22`. Neither vehicle vanished or overwrote the other.

---

### Step 4: Demonstrate Drive-In User (VEH-003 No Reservation)
1. In **Tab 2**, switch vehicle to `VEH-003`.
2. **Show the Examiner**:
   - Card 2 clearly displays: **`NO RESERVATION`** / **`Drive-in Parking`**.
   - Dynamic Facility Availability shows `38 / 60 spaces` verified available.
   - Demonstrates that unreserved walk-in/drive-in drivers receive dynamic allocation rather than fabricated pre-bookings.

---

### Step 5: Demonstrate Background Tab Continuity
1. In **Tab 1 (User A)**, open `/user/parking/session` to observe the running session timer for `VEH-001`.
2. Switch tabs away from Tab 1 to Tab 3 (Admin) for 15 seconds.
3. Return to **Tab 1**:
   - **Show the Examiner**: The session duration continued seamlessly according to true wall-clock time (`Date.now() - parkedTimeMs`), without pauses, resets, or clock drift.

---

### Step 6: Inspect Genuine CCTV Evidence & Provenance
1. On Tab 3 (or Tab 1), click **CCTV Evidence Viewer**.
2. **CAM-01 (Entry Gate)**:
   - Play `cam1_entry_gate.mp4`. Show the physical barrier lifting and maroon vehicle entering.
   - Point out the bumper plate: `KA05ML7220 (Visually observed, OCR unverified)`.
3. **CAM-02 (Parking Bay)**:
   - Play `cam2_parking_bay.mp4`. Show physical parked cars (`KA05ND1565`, `KA03NY0035`).
   - Highlight the Honest Limitation Notice: *Parking maneuver not observed (vehicles are already parked throughout 15s clip)*.
4. **CAM-03 (Exit Ramp)**:
   - Play `cam3_exit_ramp.mp4`. Show the physical boom barrier arm, scanner pedestal, and speed bumps.
   - Highlight the Honest Limitation Notice: *Vehicle egress not observed in clip; exit trigger is an application-level event (`APP_DECISION`)*.

---

### Step 7: Explain ANPR Benchmark Provenance
1. While still in the Evidence Viewer (or viewing Vehicle Provenance Card):
2. **Explain the Honest Separation**:
   - Machine ANPR benchmark: `KA04MN8049` (Track #6, 98% PaddleOCR from benchmark video `test_video.mp4`).
   - CCTV Entry observation: `KA05ML7220` (from DVR camera `cam1_entry_gate.mp4`).
   - **`ANPR BENCHMARK ≠ PHYSICAL CCTV IDENTITY`**
   - **`IDENTITY LINKAGE: UNVERIFIED`**
   - Highlight that ParkTwin AI strictly avoids fabricating fake OCR results or invented cross-camera linkages.

---

### Step 8: Demonstrate Exit & Bay Release
1. In **Tab 1 (User A)**, click **EXIT PARKING**.
2. Advance through gateway confirmation.
3. Switch immediately to **Tab 3 (Admin Digital Twin)**:
   - Point out that bay `P24` (`SP-24`) immediately flips back to **`AVAILABLE` (Red/Free)**.
   - Bay `P14` (`SP-14`) occupied by `VEH-002` remains **`OCCUPIED`**.
   - Occupancy count decrements cleanly from `22` to `21`.

---

### Step 9: Global Reset
1. In Tab 3 (Admin), click **Reset Movie** (or Tab 1 click **Reset Demo**).
2. Point out that all three tabs simultaneously revert to the baseline configuration without manual page reloads.

---

## 🎓 Examiner Questions & Factual Technical Answers

#### Q1: Why are the ANPR benchmark plate (`KA04MN8049`) and the CCTV entrance plate (`KA05ML7220`) different?
> **Answer**:  
> "ParkTwin adheres strictly to academic and forensic truth. Our real ANPR ML pipeline (YOLOv8 + ByteTrack + PaddleOCR) was evaluated against an annotated reference video (`test_video.mp4`), where it extracted `KA04MN8049` at 98% confidence on Track #6. Meanwhile, the physical DVR camera at the entrance (`cam1_entry_gate.mp4`) captured a maroon vehicle with visible plate `KA05ML7220`. Because continuous multi-camera re-identification across different days was not part of the physical footage, we explicitly label `IDENTITY LINKAGE: UNVERIFIED`. We do not alter machine logs or forge fake plates to pretend they are the same car."

#### Q2: Why doesn't CAM-03 show the vehicle driving out through the barrier?
> **Answer**:  
> "The supplied physical CCTV recording for CAM-03 (`cam3_exit_ramp.mp4`) is an authentic 14.96-second DVR clip showing the real exit infrastructure—the automatic boom barrier, access card scanner pedestal, speed breakers, and ramp roadway. During those 15 seconds, no car happened to exit. Rather than generating a deepfake or fabricating footage, the system truthfully labels the camera as `EXIT INFRASTRUCTURE CCTV` with `VEHICLE EGRESS: NOT OBSERVED IN SOURCE CLIP`, and notes that the exit clearance event is an `APP_DECISION` driven by software."

#### Q3: Is the Digital Twin physical or application-driven?
> **Answer**:  
> "The Digital Twin is a **hybrid multi-layer system**. The facility geometry (1472×1508 layout, 60 parking bays, 16 camera placements, driving lanes) is 100% grounded in the real physical architectural plan of the B2 Carparking-01 facility. Vehicle arrivals, bay occupations, and departure transitions are governed by an event-driven state machine synchronized across clients via `BroadcastChannel` and persistent storage."

#### Q4: How does multi-user synchronization work between driver tabs and the admin screen?
> **Answer**:  
> "ParkTwin uses a dual-layer synchronization architecture:
> 1. **Cross-Tab Broadcast Protocol**: In-browser tabs communicate via the native `BroadcastChannel` API (`parktwin_sync_channel`) with zero server overhead and sub-10ms latency.
> 2. **Authoritative Storage Hydration**: State is backed by structured LocalStorage records with version monotonicity, epoch timestamps, and automatic conflict detection, enabling backgrounded tabs or hard page refreshes to immediately re-hydrate the live facility state."

#### Q5: How does the system prevent two vehicles from claiming or occupying the same parking bay?
> **Answer**:  
> "Slot conflict protection is enforced deterministically by the `checkSlotConflict()` guard. Before assigning a bay or starting navigation, the system inspects both active vehicle journeys and the shared facility twin state. If another vehicle has already reserved, occupied, or is actively navigating to that bay, the action is rejected with `SLOT_UNAVAILABLE_CONFLICT`."

#### Q6: What does the ANPR pipeline contribute to the project?
> **Answer**:  
> "The ANPR pipeline provides automated vehicle identification at gateway thresholds. It processes high-resolution video streams through a three-stage computer vision model: YOLOv8 vehicle detection, ByteTrack spatial tracking, and PaddleOCR text extraction. In our ground-truth benchmark on 191 frames, it successfully extracted plate numbers with up to 98% confidence."

#### Q7: What does the Digital Twin contribute beyond a traditional parking database?
> **Answer**:  
> "Traditional systems store parking as static numerical counts (`25/60 free`). The Digital Twin adds **spatial intelligence**:
> 1. Exact coordinate-level mapping of vehicle locations relative to physical infrastructure.
> 2. Real-time Dijkstra/A* pathfinding that computes shortest collision-free routes along facility aisles.
> 3. Visual correlation of camera coverage cones to specific parking stalls, enabling one-click CCTV physical evidence inspection for any bay or vehicle."
