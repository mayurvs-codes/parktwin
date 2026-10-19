# ParkTwin AI — Geometry Reconciliation Report

**Date:** 2026-10-19  
**Branch:** `feat/3d-voice-violation`  
**Authoritative Sources:**
1. Architectural Floor Plans: `media_1791002045319.png` (Carparking-01 B2 Authoritative CAD Blueprint)
2. Vector CAD Overlay: `apps/web/public/cad-floorplan.png` (1472 × 1508 operational canvas)
3. PDF Vector Extraction: `floorplan_page_1.png` / `Floor Plans 03.06.2022.pdf` (Level 75.0/78.75M)

---

## 1. Executive Summary

- **Total Bays Defined:** 24 bays canonically indexed (SP-01 to SP-24) across Focused Island 1 and Perimeter.
- **Focused Demo Zone (Island 1):** 20 bays (SP-01 to SP-20) are **100% verified** against the CAD blueprint and vector grid.
- **Background/Perimeter Zone:** Bays SP-21 to SP-24 represent the North Perimeter transition row (confidence: `MEDIUM_CONFIDENCE`, `verified: false`).
- **Coordinate Space:** Authoritative SVG viewBox is `0 0 1472 1508` (20 px/meter scale). 3D world space coordinates map `1 px = 0.05m`.

---

## 2. Bay-by-Bay Reconciliation Table

| Bay ID | Alias | Zone | Source Reference | Confidence | Verified | Uncertainty / Notes |
|:-------|:------|:-----|:-----------------|:-----------|:---------|:---------------------|
| **SP-01** | P01 | Zone B (Upper Island North) | CAD Blueprint Island 1 Col 1 | `VERIFIED` | **true** | None. Stall dimension 2.8m × 5.4m. |
| **SP-02** | P02 | Zone B (Upper Island North) | CAD Blueprint Island 1 Col 2 | `VERIFIED` | **true** | None. High confidence. |
| **SP-03** | P03 | Zone B (Upper Island North) | CAD Blueprint Island 1 Col 3 | `VERIFIED` | **true** | None. Standard stall. |
| **SP-04** | P04 | Zone B (Upper Island North) | CAD Blueprint Island 1 Col 4 | `VERIFIED` | **true** | None. High confidence. |
| **SP-05** | P05 | Zone B (Upper Island North) | CAD Blueprint Island 1 Col 5 | `VERIFIED` | **true** | None. Standard stall. |
| **SP-06** | P06 | Zone B (Upper Island North) | CAD Blueprint Island 1 Col 6 | `VERIFIED` | **true** | None. Adjacent to central aisle. |
| **SP-07** | P07 | Zone B (Upper Island North) | CAD Blueprint Island 1 Col 7 | `VERIFIED` | **true** | User A designated bay. Exact match. |
| **SP-08** | P08 | Zone B (Upper Island North) | CAD Blueprint Island 1 Col 8 | `VERIFIED` | **true** | None. Island 1 East end. |
| **SP-09** | P09 | Zone B (Upper Island South) | CAD Blueprint Island 1 South 1 | `VERIFIED` | **true** | Facing 2nd horizontal aisle. |
| **SP-10** | P10 | Zone B (Upper Island South) | CAD Blueprint Island 1 South 2 | `VERIFIED` | **true** | Standard stall. |
| **SP-11** | P11 | Zone B (Upper Island South) | CAD Blueprint Island 1 South 3 | `VERIFIED` | **true** | Violation scenario destination. Exact match. |
| **SP-12** | P12 | Zone B (Upper Island South) | CAD Blueprint Island 1 South 4 | `VERIFIED` | **true** | Standard stall. |
| **SP-13** | P13 | Zone B (Upper Island South) | CAD Blueprint Island 1 South 5 | `VERIFIED` | **true** | Standard stall. |
| **SP-14** | P14 | Zone B (Upper Island South) | CAD Blueprint Island 1 South 6 | `VERIFIED` | **true** | User B reservation bay. Verified reserved. |
| **SP-15** | P15 | Zone B (Upper Island South) | CAD Blueprint Island 1 South 7 | `VERIFIED` | **true** | Standard stall. |
| **SP-16** | P16 | Zone B (Upper Island South) | CAD Blueprint Island 1 South 8 | `VERIFIED` | **true** | Island 1 South East end. |
| **SP-17** | P17 | Zone B (Upper Island West) | CAD Blueprint Island 1 West 1 | `VERIFIED` | **true** | Guest persona target. Horizontal stall. |
| **SP-18** | P18 | Zone B (Upper Island West) | CAD Blueprint Island 1 West 2 | `VERIFIED` | **true** | Horizontal stall. |
| **SP-19** | P19 | Zone B (Upper Island West) | CAD Blueprint Island 1 West 3 | `VERIFIED` | **true** | Available in baseline. Horizontal stall. |
| **SP-20** | P20 | Zone B (Upper Island West) | CAD Blueprint Island 1 West 4 | `VERIFIED` | **true** | Horizontal stall. |
| **SP-21** | P21 | Zone A (North Perimeter) | Floorplan Level 2 Perimeter | `MEDIUM_CONFIDENCE` | **false** | Perimeter boundary clearance uncalibrated. |
| **SP-22** | P22 | Zone A (North Perimeter) | Floorplan Level 2 Perimeter | `MEDIUM_CONFIDENCE` | **false** | Approximate spacing from Col 1. |
| **SP-23** | P23 | Zone A (North Perimeter) | Floorplan Level 2 Perimeter | `MEDIUM_CONFIDENCE` | **false** | Approximate position. |
| **SP-24** | P24 | Zone A (North Perimeter) | Floorplan Level 2 Perimeter | `MEDIUM_CONFIDENCE` | **false** | Secondary reserved candidate in legacy specs. |

---

## 3. Structural & Environmental Elements

### 3.1 Drive Aisles
- **North Perimeter Lane (`north_perimeter`):** width 3.4m, centerline coordinates verified against north driveway.
- **Main West Trunk (`main_west_trunk`):** width 4.0m, main north-south circulation spine.
- **Upper West Aisle (`upper_west_aisle`):** width 3.75m, drive aisle between North Perimeter and Island 1.
- **Mid West Aisle (`mid_west_aisle`):** width 3.75m, drive aisle south of Island 1.

### 3.2 Gateways & Obstacles
- **B2 Vehicle Access Point (`ACCESS_POINT_B2`):** Located at Top Right (x: 1105, y: 55). Verified gateway.
- **Pedestrian Cores:** Left stair/lift core and secondary corridor. Verified vehicle-forbidden.
- **Structural Concrete Columns:** Standard 18×18 px (0.9m × 0.9m) pillars positioned along structural grid lines.

---

## 4. Reconciliation Verdict
All 20 operational demo bays (SP-01 through SP-20) are geometrically reconciled with zero fabricated positions. Unverified bays (SP-21 to SP-24) are explicitly marked `verified: false`.
