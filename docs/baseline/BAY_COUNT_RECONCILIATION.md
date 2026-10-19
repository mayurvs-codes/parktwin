# ParkTwin AI — Bay Count & Geometry Reconciliation Report (24 vs 52 vs 58)

**Document:** `docs/baseline/BAY_COUNT_RECONCILIATION.md`  
**Date:** 2026-10-19  
**Branch:** `feat/3d-voice-violation`  
**Authoritative Sources:**
1. Architectural Blueprint: `Floor Plans 03.06.2022.pdf` — Page 1 (Level 75.0 / 78.75 M LVL)
2. Operational CAD Overlay: `apps/web/public/cad-floorplan.png` (1472 × 1508 canvas, 20 px/m)
3. Canonical Geometry: `shared/facility_geometry.json` & `apps/web/config/facility_geometry.json`
4. Space Inventory: `apps/web/components/digital-twin/twinConfig.ts` (`PHYSICAL_PARKING_SPACES`)

---

## 1. Executive Summary: Resolving the Bay Count Discrepancies

Across the documentation, commit history, and source code, four distinct bay numbers appear: **20**, **24**, **52**, and **58**. This report formally reconciles these numbers and explains their exact provenance:

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                    ARCHITECTURAL BLUEPRINT INVENTORY                        │
  │                                                                             │
  │  [42 Structured Bays]   +   [10 Scattered Perimeter Bays]  =  52 BAYS       │
  │  (HIGH_CONFIDENCE)          (MEDIUM_CONFIDENCE)              (Design Cap)   │
  │  PHYS_001 – PHYS_042        PHYS_043 – PHYS_052                             │
  │                                                                             │
  │                                   +                                         │
  │                                                                             │
  │  [6 Unverified Core Boundary Candidates]                   =  58 BAYS       │
  │  (UNVERIFIED)                                                (Total Extracted│
  │  PHYS_053 – PHYS_058                                          Candidates)   │
  └─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                    RUNTIME SYSTEM CONFIGURATION                             │
  │                                                                             │
  │  [20 Verified Zone B Bays]  +  [4 Unverified Perimeter Bays] = 24 BAYS     │
  │  (VERIFIED / true)             (MEDIUM_CONFIDENCE / false)   (facility_     │
  │  SP-01 – SP-20                 SP-21 – SP-24                  geometry.json)│
  │  (Active Demo & Voice Twin)    (Dashed / Uncalibrated)                      │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### Breakdown of Bay Counts

| Count | Classification | Source File / Scope | Description & Reconciliation Status |
|:-----:|:---------------|:--------------------|:------------------------------------|
| **58** | **Total Blueprint Space Candidates** | `twinConfig.ts` (`PHYSICAL_PARKING_SPACES`) | Full vector extraction from Level 75.0/78.75M CAD blueprint. Contains 42 structured row bays + 10 scattered perimeter stalls + 6 candidate stalls near unverified transition cores. |
| **52** | **Architectural Facility Capacity** | Architectural Design Specifications | The approved physical facility bay capacity. Strictly equals 42 structured stalls (`PHYS_001`–`PHYS_042`) plus 10 perimeter stalls (`PHYS_043`–`PHYS_052`). The 6 unverified candidate stalls are excluded from certified facility capacity. |
| **24** | **Configured Runtime Facility Slots** | `shared/facility_geometry.json` (`SP-01`–`SP-24`) | Canonical slots registered in the backend and digital twin geometry: 20 verified Upper Island stalls (`SP-01`–`SP-20`) plus 4 unverified North Perimeter stalls (`SP-21`–`SP-24`). |
| **20** | **Focused Operational Demo Zone** | User Portal, Voice Guidance, E2E Tests | Active operational zone (Zone B Upper Island 1: `SP-01`–`SP-20`) featuring live ANPR tracking, voice relocation announcements, reservation management, and 3D visual rendering. |

---

## 2. Geometry Sources & Coordinate Systems

### 2.1 CAD Blueprint Vector Extraction (`twinConfig.ts`)
- **Source Document:** `Floor Plans 03.06.2022.pdf` (Page 1)
- **Bounding Box:** `1684 × 2384` PDF points
- **Facility Footprint:** Left half, `X ∈ [0, 842]`, `Y ∈ [0, 2384]`
- **Structure:**
  - **Structured Rows (42 spaces, HIGH_CONFIDENCE):**
    - North Perimeter: 8 spaces (`PHYS_001`–`PHYS_008`)
    - Upper West Bay (Island 1): 16 spaces (8 upper `PHYS_009`–`PHYS_016`, 8 lower `PHYS_017`–`PHYS_024`)
    - Mid West Bay (Island 2): 12 spaces (6 upper `PHYS_025`–`PHYS_030`, 6 lower `PHYS_031`–`PHYS_036`)
    - Lower Mid Bay (Island 3): 4 spaces (2 upper `PHYS_037`–`PHYS_038`, 2 lower `PHYS_039`–`PHYS_040`)
    - South Perimeter: 2 spaces (`PHYS_041`–`PHYS_042`)
  - **Scattered Perimeter Spaces (10 spaces, MEDIUM_CONFIDENCE):**
    - Zone A Perimeter (y=680): 5 spaces (`PHYS_043`–`PHYS_047`)
    - Zone E Perimeter (y=1510): 5 spaces (`PHYS_048`–`PHYS_052`)
  - **Unverified Transition Candidates (6 spaces, UNVERIFIED):**
    - Zone D East Extension: 2 spaces (`PHYS_053`–`PHYS_054`, x=763, 821, y=1474)
    - Zone A West Transition: 2 spaces (`PHYS_055`–`PHYS_056`, x=530, 589, y=108)
    - Zone B Core Boundary: 2 spaces (`PHYS_057`–`PHYS_058`, x=740, y=800, 857)

### 2.2 Operational Digital Twin Canvas (`facility_geometry.json`)
- **Canvas Dimensions:** `1472 × 1508` pixels
- **Scale:** 20 pixels per meter (`scale_pixels_per_meter: 20.0`)
- **Standard Stall Size:** 2.8m width × 5.4m length (56 × 108 pixels canvas / 48 × 76 pixels visual clearance)
- **Primary Driving Aisles:** 3.4m to 4.0m drive clearance
- **Vehicle Gateway:** `ACCESS_POINT_B2` (x: 1105, y: 55), single physical gateway covering entry (CAM-01) and exit (CAM-16).

---

## 3. Master Bay Reconciliation Table

This table maps every runtime bay in `shared/facility_geometry.json` and every physical blueprint candidate in `twinConfig.ts`:

| Runtime Slot ID | Alias | Physical ID | Zone | Canvas Center (x, y) | 3D World (x, y, z) | Confidence | Verified | Description & Blueprint Source |
|:---------------:|:-----:|:-----------:|:-----|:--------------------:|:------------------:|:----------:|:--------:|:-------------------------------|
| **SP-01** | P01 | `PHYS_009` | Zone B (Upper Island) | (634, 403) | (-14.4, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island North Row, Stall 1 |
| **SP-02** | P02 | `PHYS_010` | Zone B (Upper Island) | (694, 403) | (-11.2, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island North Row, Stall 2 |
| **SP-03** | P03 | `PHYS_011` | Zone B (Upper Island) | (754, 403) | (-8.0, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island North Row, Stall 3 |
| **SP-04** | P04 | `PHYS_012` | Zone B (Upper Island) | (814, 403) | (-4.8, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island North Row, Stall 4 |
| **SP-05** | P05 | `PHYS_013` | Zone B (Upper Island) | (874, 403) | (-1.6, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island North Row, Stall 5 |
| **SP-06** | P06 | `PHYS_014` | Zone B (Upper Island) | (934, 403) | (1.6, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island North Row, Stall 6 |
| **SP-07** | P07 | `PHYS_015` | Zone B (Upper Island) | (994, 403) | (4.8, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island North Row, Stall 7 (Scenario Assigned Bay) |
| **SP-08** | P08 | `PHYS_016` | Zone B (Upper Island) | (1054, 403) | (8.0, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island North Row, Stall 8 |
| **SP-09** | P09 | `PHYS_017` | Zone B (Upper Island) | (634, 543) | (11.2, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island South Row, Stall 1 |
| **SP-10** | P10 | `PHYS_018` | Zone B (Upper Island) | (694, 543) | (14.4, 0.0, -6.2) | `VERIFIED` | **true** | Upper Island South Row, Stall 2 |
| **SP-11** | P11 | `PHYS_019` | Zone B (Upper Island) | (754, 543) | (-14.4, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island South Row, Stall 3 (Wrong-Bay Violation Target) |
| **SP-12** | P12 | `PHYS_020` | Zone B (Upper Island) | (814, 543) | (-11.2, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island South Row, Stall 4 |
| **SP-13** | P13 | `PHYS_021` | Zone B (Upper Island) | (874, 543) | (-8.0, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island South Row, Stall 5 |
| **SP-14** | P14 | `PHYS_022` | Zone B (Upper Island) | (934, 543) | (-4.8, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island South Row, Stall 6 (Reserved VIP Stall) |
| **SP-15** | P15 | `PHYS_023` | Zone B (Upper Island) | (994, 543) | (-1.6, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island South Row, Stall 7 |
| **SP-16** | P16 | `PHYS_024` | Zone B (Upper Island) | (1054, 543) | (1.6, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island South Row, Stall 8 |
| **SP-17** | P17 | `PHYS_001` | Zone B (Upper Island) | (568, 364) | (4.8, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island West End, Horizontal Stall 1 |
| **SP-18** | P18 | `PHYS_002` | Zone B (Upper Island) | (568, 424) | (8.0, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island West End, Horizontal Stall 2 |
| **SP-19** | P19 | `PHYS_003` | Zone B (Upper Island) | (568, 484) | (11.2, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island West End, Horizontal Stall 3 |
| **SP-20** | P20 | `PHYS_004` | Zone B (Upper Island) | (568, 544) | (14.4, 0.0, 6.2) | `VERIFIED` | **true** | Upper Island West End, Horizontal Stall 4 |
| **SP-21** | P21 | `PHYS_005` | Zone A (North Perimeter) | (254, 183) | (-22.0, 0.0, -18.0) | `MEDIUM_CONFIDENCE` | **false** | North Perimeter Transition Stall 1 (Unverified clearance) |
| **SP-22** | P22 | `PHYS_006` | Zone A (North Perimeter) | (319, 183) | (-18.75, 0.0, -18.0)| `MEDIUM_CONFIDENCE` | **false** | North Perimeter Transition Stall 2 (Unverified clearance) |
| **SP-23** | P23 | `PHYS_007` | Zone A (North Perimeter) | (384, 183) | (-15.5, 0.0, -18.0) | `MEDIUM_CONFIDENCE` | **false** | North Perimeter Transition Stall 3 (Unverified clearance) |
| **SP-24** | P24 | `PHYS_008` | Zone A (North Perimeter) | (449, 183) | (-12.25, 0.0, -18.0)| `MEDIUM_CONFIDENCE` | **false** | North Perimeter Transition Stall 4 (Unverified clearance) |
| — | — | `PHYS_025`–`PHYS_036` | Zone C (Mid West Bay) | Variable | Variable | `HIGH_CONFIDENCE` | **false** | 12 structured spaces on Island 2 (unmapped to runtime slots) |
| — | — | `PHYS_037`–`PHYS_040` | Zone D (Lower Mid Bay) | Variable | Variable | `HIGH_CONFIDENCE` | **false** | 4 structured spaces on Island 3 (unmapped to runtime slots) |
| — | — | `PHYS_041`–`PHYS_042` | Zone E (South Perimeter) | Variable | Variable | `HIGH_CONFIDENCE` | **false** | 2 structured spaces at South Perimeter |
| — | — | `PHYS_043`–`PHYS_052` | Zone A & E Perimeter | Variable | Variable | `MEDIUM_CONFIDENCE` | **false** | 10 scattered perimeter stalls (part of 52-bay design cap) |
| — | — | `PHYS_053`–`PHYS_058` | Zone A, B, D Candidates | Variable | Variable | `UNVERIFIED` | **false** | 6 candidate stalls near unverified transition core boundaries |

---

## 4. UI/UX Rendering Rules for Unverified Bays

To ensure transparency and prevent operational confusion:

1. **2D Interactive Twins (`TwinSlot2D.tsx`, `FacilityMap.tsx`, `TwinCanvas2D.tsx`):**
   - Bays with `verified: false` or confidence `MEDIUM_CONFIDENCE` / `UNVERIFIED` (e.g. `SP-21` through `SP-24` and background stalls) are rendered with a **dashed stroke** (`strokeDasharray="4 4"` / `dash={[4, 4]}`) and **reduced opacity** (0.65–0.75).
   - Unverified bays show an explicit `(Unverified)` indicator badge or `[?]` suffix.
   - `TwinLegend.tsx` includes an "Unverified / Candidate Bay" entry with a dashed border legend swatch.

2. **3D Zone Rendering (`UnifiedTwinCanvas3D.tsx`, `ParkingBay3D.ts`):**
   - Unverified bays (`SP-21`–`SP-24`) display translucent boundary paint (`opacity: 0.55`) and an explicit `(Unverified)` stencil marker on the asphalt.
   - Floor threshold LED beacons on unverified bays remain in standby / unconfigured state rather than active green.
