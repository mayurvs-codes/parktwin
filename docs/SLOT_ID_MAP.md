# ParkTwin AI — Authoritative Slot ID Mapping Specification

**Authoritative Canonical Scheme:** `SP-01` through `SP-24`  
**Legacy Prototype Alias:** `P01` through `P24` (1:1 mapping: `PXX` $\leftrightarrow$ `SP-XX`)  
**Physical Architect ID:** `PHYS_001` through `PHYS_058`  
**Authoritative Source of Truth:** `shared/facility_geometry.json` (mirrored in `apps/web/config/facility_geometry.json`)

---

## 1. Architectural Decision & Canonical ID Rule

To resolve historical discrepancies between the initial prototype (`P01..P10`), architectural CAD drawings (`PHYS_001..PHYS_058`), and the Digital Twin / Voice Violation intelligence (`SP-01..SP-24`):

1. **`SP-XX` is the CANONICAL identifier.**  
   All runtime events, database records, WebSocket broadcasts, 2D canvas displays, 3D world meshes, and voice announcements use `SP-XX` as their primary key.
2. **`PXX` is the AUTHORITATIVE ALIAS.**  
   To guarantee backwards compatibility with earlier prototype replay logs and specifically the **`monday` scenario** (`data/scenarios/monday.json`), all systems accept `PXX` interchangeably and resolve it to `SP-XX` (`P01` $\leftrightarrow$ `SP-01`, `P07` $\leftrightarrow$ `SP-07`, etc.).
3. **Cross-Stack Synchrony Requirement:**  
   The navigation graph, 2D twin canvas, 3D Three.js scene, backend routes, and demo state stores MUST resolve the exact same spatial location and properties for `SP-XX` and its alias `PXX`.

---

## 2. Complete Cross-Subsystem Slot ID Matrix

| Canonical ID | Alias (Prototype) | Physical CAD ID | Zone | Canvas 2D $(x, y)$ | 3D World $(x, z)$ | Nav Graph Node | Nav Junction | Covering Camera | Scenario Roles |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SP-01** | `P01` | `PHYS_001` | Zone B (Upper) | $(476, 720)$ | $(-3.6, -2.4)$ | `SP-01` / `P01` | `UPPER_WEST_JUNCTION` | CAM-02 | Monday (VH-001) / Demo occupied |
| **SP-02** | `P02` | `PHYS_002` | Zone B (Upper) | $(534, 720)$ | $(-1.8, -2.4)$ | `SP-02` / `P02` | `UPPER_WEST_JUNCTION` | CAM-02 | Monday (VH-002) / Demo occupied |
| **SP-03** | `P03` | `PHYS_003` | Zone B (Upper) | $(591, 720)$ | $(0.0, -2.4)$ | `SP-03` / `P03` | `UPPER_WEST_JUNCTION` | CAM-02 | Monday (VH-003) / Demo occupied |
| **SP-04** | `P04` | `PHYS_004` | Zone B (Upper) | $(648, 720)$ | $(1.8, -2.4)$ | `SP-04` / `P04` | `UPPER_WEST_JUNCTION` | CAM-02 | Monday (VH-004) / Demo occupied |
| **SP-05** | `P05` | `PHYS_005` | Zone B (Upper) | $(706, 720)$ | $(3.6, -2.4)$ | `SP-05` / `P05` | `UPPER_WEST_JUNCTION` | CAM-02 | Monday (VH-005) / Demo occupied |
| **SP-06** | `P06` | `PHYS_006` | Zone B (Upper) | $(763, 720)$ | $(-3.6, 2.4)$ | `SP-06` / `P06` | `MID_WEST_JUNCTION` | CAM-02 | Monday (VH-006) / Demo occupied |
| **SP-07** | `P07` | `PHYS_007` | Zone B (Upper) | $(821, 720)$ | $(-1.8, 2.4)$ | `SP-07` / `P07` | `MID_WEST_JUNCTION` | CAM-02 | Monday (VH-007) / User A Designated Space |
| **SP-08** | `P08` | `PHYS_008` | Zone B (Upper) | $(878, 720)$ | $(0.0, 2.4)$ | `SP-08` / `P08` | `MID_WEST_JUNCTION` | CAM-02 | Demo occupied |
| **SP-09** | `P09` | `PHYS_009` | Zone B (Upper) | $(936, 720)$ | $(1.8, 2.4)$ | `SP-09` / `P09` | `MID_WEST_JUNCTION` | CAM-02 | Demo occupied |
| **SP-10** | `P10` | `PHYS_010` | Zone B (Upper) | $(993, 720)$ | $(3.6, 2.4)$ | `SP-10` / `P10` | `MID_WEST_JUNCTION` | CAM-02 | Demo occupied |
| **SP-11** | `P11` | `PHYS_011` | Zone B (Lower) | $(476, 856)$ | $(-3.6, 4.8)$ | `SP-11` / `P11` | `MID_WEST_JUNCTION` | CAM-02 | Wrong-Bay Violation Target Space |
| **SP-12** | `P12` | `PHYS_012` | Zone B (Lower) | $(534, 856)$ | $(-2.7, 4.8)$ | `SP-12` / `P12` | `MID_WEST_JUNCTION` | CAM-02 | Demo occupied |
| **SP-13** | `P13` | `PHYS_013` | Zone B (Lower) | $(591, 856)$ | $(-1.8, 4.8)$ | `SP-13` / `P13` | `MID_WEST_JUNCTION` | CAM-02 | Demo occupied |
| **SP-14** | `P14` | `PHYS_014` | Zone B (Lower) | $(648, 856)$ | $(-0.9, 4.8)$ | `SP-14` / `P14` | `MID_WEST_JUNCTION` | CAM-02 | User B Reserved Space |
| **SP-15** | `P15` | `PHYS_015` | Zone B (Lower) | $(706, 856)$ | $(0.0, 4.8)$ | `SP-15` / `P15` | `MID_WEST_JUNCTION` | CAM-02 | Demo occupied |
| **SP-16** | `P16` | `PHYS_016` | Zone B (Lower) | $(763, 856)$ | $(0.9, 4.8)$ | `SP-16` / `P16` | `MID_WEST_JUNCTION` | CAM-02 | Demo occupied |
| **SP-17** | `P17` | `PHYS_017` | Zone B (Lower) | $(821, 856)$ | $(1.8, 4.8)$ | `SP-17` / `P17` | `MID_WEST_JUNCTION` | CAM-02 | Guest Available Space |
| **SP-18** | `P18` | `PHYS_018` | Zone B (Lower) | $(878, 856)$ | $(2.7, 4.8)$ | `SP-18` / `P18` | `MID_WEST_JUNCTION` | CAM-02 | Demo occupied |
| **SP-19** | `P19` | `PHYS_019` | Zone B (Lower) | $(936, 856)$ | $(3.6, 4.8)$ | `SP-19` / `P19` | `MID_WEST_JUNCTION` | CAM-02 | Guest Available Space |
| **SP-20** | `P20` | `PHYS_020` | Zone B (Lower) | $(993, 856)$ | $(4.5, 4.8)$ | `SP-20` / `P20` | `MID_WEST_JUNCTION` | CAM-02 | Demo occupied |
| **SP-21** | `P21` | `PHYS_021` | Zone C (West) | $(55, 1460)$ | $(-5.0, -4.0)$ | `SP-21` / `P21` | `UPPER_WEST_JUNCTION` | CAM-03 | Unverified Perimeter |
| **SP-22** | `P22` | `PHYS_022` | Zone C (West) | $(55, 1555)$ | $(-5.0, -2.0)$ | `SP-22` / `P22` | `UPPER_WEST_JUNCTION` | CAM-03 | Unverified Perimeter |
| **SP-23** | `P23` | `PHYS_023` | Zone C (West) | $(55, 1650)$ | $(-5.0, 0.0)$ | `SP-23` / `P23` | `UPPER_WEST_JUNCTION` | CAM-03 | Unverified Perimeter |
| **SP-24** | `P24` | `PHYS_024` | Zone C (West) | $(55, 1745)$ | $(-5.0, 2.0)$ | `SP-24` / `P24` | `UPPER_WEST_JUNCTION` | CAM-03 | Unverified Perimeter |

---

## 3. Implementation Rules by Subsystem

### A. Navigation Service (`backend/services/navigation_service.py`)
- Ingests `shared/facility_geometry.json`.
- Dynamically creates graph nodes for every `bay.id` (`SP-XX`) and `bay.alias` (`PXX`), connecting them to the same junction edge.
- `compute_route("ACCESS_POINT_B2", destination)` succeeds whether destination is `"SP-07"` or `"P07"`.

### B. Digital Twin Configuration (`apps/web/components/digital-twin/twinConfig.ts`)
- `SLOT_3D_POSITIONS` defines world coordinates for all canonical `SP-01..SP-24` and legacy `P01..P24`.
- `CALIBRATED_SLOT_ANCHORS` and `getSlotAnchor` support both prefix formats.

### C. Scenario Playback (`data/scenarios/monday.json` & `wrong-bay.json`)
- `monday.json` retains its original `"P01".. "P07"` references and is interpreted as `SP-01..SP-07`.
- `wrong-bay.json` explicitly exercises `SP-07` (assigned designated space) and `SP-11` (wrong physical bay).
- Both scenarios run without error or missing node exceptions.

### D. Automated Consistency Test
- `tests/unit/test_slot_id_consistency.py` verifies that all bay IDs in `shared/facility_geometry.json`:
  1. Have an exact 1:1 alias in `PXX` format.
  2. Are routable via `backend/services/navigation_service.py` under both `SP-XX` and `PXX`.
  3. Resolve valid 3D coordinates in `apps/web/components/digital-twin/twinConfig.ts`.
  4. Are correctly matched in `data/scenarios/monday.json` and `data/scenarios/wrong-bay.json`.
