# Frontend Pages Reference (`apps/web/app/`)

Detailed breakdown of all 10 application pages:

---

## 1. `/dashboard` — Master Operations Dashboard
- Displays total lot capacity, occupied count, free bays, and percentage rate.
- Interactive 10-slot grid (`P01`–`P10`) updating dynamically via WebSockets.
- Recent vehicle arrival feed with plate chips and brand logos.

---

## 2. `/digital-twin` — 3D Smart Lot Twin
- Three.js / WebGL canvas rendering the physical parking structure in real-time.
- 3 Multi-Station Upload Cards:
  - **Entry Station (`station_entry`)**: Ingests vehicle arrival footage.
  - **Parking Lot (`station_parking`)**: Visualizes bay occupation in 3D space.
  - **Exit Station (`station_exit`)**: Ingests departure footage and triggers session close.

---

## 3. `/anpr` — Automated Number Plate Recognition Lab
- Drag-and-drop zone accepting `.mp4` and `.avi` video clips.
- Real-time progress indicator during pipeline execution.
- Download links for annotated bounding-box video, CSV logs, and JSON data.
- Results table showing track ID, formatted plate, confidence %, vehicle type, brand, and color.
