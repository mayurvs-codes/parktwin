# Section 07: Frontend Application Architecture

The **ParkTwin Frontend** (`apps/web/`) is built on **Next.js 15.5**, **React 19**, **TypeScript 5**, and **Tailwind CSS**, featuring real-time WebSocket state synchronizers, interactive charts, and a **Three.js 3D Digital Twin** representation of the parking lot.

---

## Page Route Directory

| Route | Page File | Purpose & UI Components |
| :--- | :--- | :--- |
| `/` | `app/page.tsx` | Landing page, platform features, quick navigation |
| `/dashboard` | `app/dashboard/page.tsx` | Real-time lot capacity, KPI summary cards, live slot occupancy grid |
| `/parking` | `app/parking/page.tsx` | Interactive slot layout (`P01`–`P10`), slot details, manual overrides |
| `/digital-twin` | `app/digital-twin/page.tsx` | 3D visual digital twin with Entry, Parking, and Exit CCTV upload stations |
| `/vehicles` | `app/vehicles/page.tsx` | Filterable and searchable table of observed vehicles and plate snapshots |
| `/video-processing` | `app/video-processing/page.tsx`| Live CCTV RTSP stream monitor and control room |
| `/anpr` | `app/anpr/page.tsx` | Drag-and-drop video benchmark uploader and license plate detection results table |
| `/analytics` | `app/analytics/page.tsx` | Operational charts, peak hours, turnover rates, traffic histograms |
| `/reports` | `app/reports/page.tsx` | Executive PDF and CSV report export generator |
| `/settings` | `app/settings/page.tsx` | System preferences, camera RTSP URLs, API token management |

---

## Architecture Reference Documents

| Document | Topic | Description |
| :--- | :--- | :--- |
| [`pages.md`](./pages.md) | Page Details | Detailed breakdown of all 10 frontend routes and user workflows |
| [`api_services.md`](./api_services.md) | Service Layer | Typed Axios API client wrappers (`anpr.ts`, `journey.ts`, `parking.ts`) |
| [`state_management.md`](./state_management.md) | State Management | Zustand store architecture and WebSocket real-time synchronization hooks |
| [`components.md`](./components.md) | UI Components | Reusable components, 3D Canvas, slot cards, metrics badges |
