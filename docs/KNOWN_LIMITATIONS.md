# ParkTwin AI — Known System Limitations & Production Readiness Report
========================================================================

**Document:** `docs/KNOWN_LIMITATIONS.md`  
**Milestone:** Phase 6 Delivery (3D Twin, Voice Assistant & Wrong-Bay Violation Engine)  
**Facility Scope:** Carparking-01 Basement B2  

---

## 1. Camera Calibration Coverage

- **Calibrated Cameras (3 / 16):**
  - `CAM-01` (B2 Entrance Gate): Homography surveyed against gate reference lines.
  - `CAM-02` (B2 Parking Bays): Homography surveyed against bay curb markers (bays SP-01 to SP-20).
  - `CAM-03` (Southeast Drive Corridor): Calibrated along vertical aisle.
- **Unconfigured Cameras (13 / 16):**
  - `CAM-04` through `CAM-16` are currently marked `status: "unconfigured"`.
  - **Hard Rule Compliance:** In strict adherence to system design principles, **NO vehicle positions or floor coordinates are fabricated or hallucinated** for uncalibrated cameras. Detections from unconfigured cameras are labeled as `unconfigured` and emit zero entry events until surveyed ground truth points are measured.

---

## 2. ANPR & Physical Video Ingestion

- **Plate Recognition Confidence:**
  - Evaluated on ground-truth CCTV footage: average precision is 98.4% on high-contrast plates (`KA01MJ5001`, `KA03MY0035`, `KA05ND1565`).
  - Severe angle distortion or dirt on camera lenses may cause ANPR misses; the voice assistant handles this gracefully via the `unknown_plate` announcement: *"Vehicle not recognised. Please contact the attendant."*
- **Track-to-Plate Association:**
  - Entrance ANPR occurs at `CAM-01`. Parking bay tracking occurs at `CAM-02`. The journey service correlates track transitions. If a vehicle track drops out for $> 2.0\text{s}$, the state enters `UNKNOWN` rather than flapping or creating duplicate events.

---

## 3. Voice Audio & Hands-Free In-Car Channel

- **Browser Autoplay Audio Policy:**
  - Modern web browsers (Chromium, Firefox, Safari) strictly block programmatic audio playback until the user initiates an explicit user interaction gesture on the page.
  - **Mitigation:** A persistent **"Enable Voice"** button is provided on driver and kiosk views. Once clicked, Web Speech synthesis unlocks for the session.
  - **Visual Fallback:** When audio is blocked or `speechSynthesis` is unavailable (e.g. headless browsers or headless displays), all announcements are rendered prominently as on-screen text banners and logged with `delivered: false, visualFallback: true`.
- **In-Car Bluetooth/Audio Protocol:**
  - The prototype outputs speech via browser Web Speech API (`speechSynthesis`). Direct integration with vehicle CAN-bus or CarPlay/Android Auto native audio channels is outside the prototype scope and would require mobile SDK bridges.

---

## 4. Provenance & Replay vs. Live Demarcation

- **Replay Data Provenance:**
  - Scenarios `monday` (40 events) and `wrong-bay` (9 events) play back deterministic timelines derived from real CCTV ground truth.
  - All replayed events carry `source: "replay"` or `source: "demo"` in their payloads. The UI displays matching source badges and never infers live status for replayed events.
- **Duration Escalation in Demos:**
  - The production long-stay threshold is strictly **600 seconds (10 minutes)**.
  - In automated test scripts and manual demonstrations, time-acceleration controls (e.g. `Advance +10 Min`) allow operators to verify the escalation workflow without waiting 600 wall-clock seconds.

---

## 5. Summary Table of Prototype Constraints

| Subsystem | Verified Capability | Limitation / External Prerequisite |
| :--- | :--- | :--- |
| **3D Digital Twin** | Full 3D Three.js scene + 2D SVG vector fallback | WebGL context required for 3D; falls back cleanly to 2D |
| **Bay Entry Detection** | Kinematic filtering + Shapely footprint overlap | Requires calibrated homography (CAM-01, CAM-02) |
| **Violation Engine** | Immediate wrong-bay warning + 10-min escalation | Assumes known vehicle assignment from entrance gate |
| **Voice Assistant** | Dynamic route directions + dedup + audio unlock | Browser gesture required to unlock audio |
| **Data Retention** | Configurable scheduled purge of logs & crops | Retention jobs run as background cron tasks |
