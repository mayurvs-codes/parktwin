# ParkTwin AI — Authoritative Digital Twin Physical Geometry
`Carparking-01 B2` Facility Geometry Specification

---

## 1. Floor Plan Source & Reference

The physical geometry of the ParkTwin Digital Twin is directly calibrated against the authoritative architectural construction drawings:

* **Source File**: `c:\Users\ASUS\Documents\Floor Plans 03.06.2022.pdf`
* **Architectural Level**: Level 78.75 M LVL (Basement 2 / B2) & Level 82.5 M LVL (Basement 1 / B1)
* **Facility Footprint**: True **L-shaped** configuration spanning `1255 × 2155` units (aspect ratio `0.582`).
* **Core Obstruction**: TECH PARK high-rise core foundation (`[345, 1585]` to `[1245, 2145]`) forming the inner reflex boundary of the L-shape.
* **Calibrated Underlay Asset**: High-resolution extraction generated at `apps/web/public/parking_exact_l_shape.png` (`1255 × 2155` px).
* **Verification Media**:
  * `B2-Baricade Entry` (Timestamp: 08-27-2026 Thu 15:45:08) — CAM-01 Entrance Gate
  * `B2-Cam 11` (Timestamp: 08-27-2026 Thu 15:45:08) — CAM-02 Zone A Parking Bays
  * `B2-Baricade Exit Cam 2` (Timestamp: 08-27-2026 Thu 15:45:09) — CAM-03 Zone B & Exit Ramp

---

## 2. Canonical Coordinate System & Scale Factor

The interactive Digital Twin, backend navigation routing, and floor-plan underlay use ONE canonical 2D vector coordinate space mapped to SVG `viewBox="0 0 1255 2155"`:

| Parameter | Digital Twin Coordinate Space | Physical Facility Equivalent | Scale Factor |
| :--- | :--- | :--- | :--- |
| **Canvas Dimensions** | 1255 × 2155 px | 62.75 m × 107.75 m | 1 px = 0.05 m (5.0 cm per pixel) |
| **Main West Driving Trunk** | 80 px width | ~4.00 m clear driving lane | 1:1 matching architectural plan |
| **Central Aisle A Width** | 75 px width | ~3.75 m clear aisle | 1:1 matching architectural plan |
| **Lower Aisle B Width** | 75 px width | ~3.75 m clear aisle | 1:1 matching architectural plan |
| **Standard Stall Width** | 62 px | ~3.10 m bay width (with line margins) | Standard Indian / IRC parking bay |
| **Standard Stall Depth** | 95 px | ~4.75 m bay depth | Standard Indian / IRC parking bay |
| **Tech Park Void Obstacle** | `[345, 1585]` to `[1245, 2145]` | 45.0 m × 28.0 m structural core | Non-drivable structural foundation |

---

## 3. Slot Coordinates Table (P01–P10)

Deterministic spatial anchors calibrated directly against the floor plan bays:

| Slot ID | Zone | X (Center) | Y (Center) | Width | Height | Orientation | Heading | Covering Camera | Physical Landmark Reference |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **P01** | Zone A | 560 px | 720 px | 62 px | 95 px | 180° | South | `CAM-02` | Bay A Stall 1, North of Central Aisle A |
| **P02** | Zone A | 650 px | 720 px | 62 px | 95 px | 180° | South | `CAM-02` | Bay A Stall 2, North of Central Aisle A |
| **P03** | Zone A | 740 px | 720 px | 62 px | 95 px | 180° | South | `CAM-02` | Bay A Stall 3, North of Central Aisle A |
| **P04** | Zone A | 830 px | 720 px | 62 px | 95 px | 180° | South | `CAM-02` | Bay A Stall 4, North of Central Aisle A |
| **P05** | Zone A | 920 px | 720 px | 62 px | 95 px | 180° | South | `CAM-02` | Bay A Stall 5, North of Central Aisle A |
| **P06** | Zone B | 560 px | 1480 px | 62 px | 95 px | 0° | North | `CAM-03` | Bay B Stall 1, South of Lower Aisle B |
| **P07** | Zone B | 650 px | 1480 px | 62 px | 95 px | 0° | North | `CAM-03` | Bay B Stall 2, South of Lower Aisle B |
| **P08** | Zone B | 740 px | 1480 px | 62 px | 95 px | 0° | North | `CAM-03` | Bay B Stall 3, South of Lower Aisle B |
| **P09** | Zone B | 830 px | 1480 px | 62 px | 95 px | 0° | North | `CAM-03` | Bay B Stall 4, South of Lower Aisle B |
| **P10** | Zone B | 920 px | 1480 px | 62 px | 95 px | 0° | North | `CAM-03` | Bay B Stall 5, South of Lower Aisle B |

---

## 4. Driving Lane Segments & Navigation Graph

The road network follows legal driving aisles:

```
[ENTRY_GATE] (360, 780)
      │
      ▼
[MAIN_LANE] (360, 820) ──────► [JUNCTION_A] (520, 820) ──────► [AISLE_A] (760, 820) ──────► [EXIT_RAMP] (1160, 820)
      │                              │                               │
      │ (South Trunk)                ▼ (P01–P05)                     ▼ (Exit Route)
      ▼                         Slots P01–P05                   Ramp to Ground
[JUNCTION_B] (520, 1400) ────► [AISLE_B] (760, 1400)
                                     │
                                     ▼ (P06–P10)
                                Slots P06–P10
```

### Canonical Waypoint Coordinates Table

| Node ID | Node Name | X (px) | Y (px) | Type | Physical Landmark |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `ENTRY_GATE` | Entry Gate (CAM-01) | 360 | 780 | Entry | Ramp touch-down & boom barrier |
| `MAIN_LANE` | Main Driving Lane | 360 | 820 | Lane | Post-barrier straight section |
| `JUNCTION_A` | Junction Row A | 520 | 820 | Junction | Turn-in point for Bay A (P01–P05) |
| `JUNCTION_B` | Junction Row B | 520 | 1400 | Junction | Turn-in point for Bay B (P06–P10) |
| `AISLE_A` | Aisle Row A (CAM-02) | 760 | 820 | Aisle | Central Aisle A along P01–P05 |
| `AISLE_B` | Aisle Row B (CAM-03) | 760 | 1400 | Aisle | Lower Aisle B along P06–P10 |
| `EXIT_RAMP` | Exit Ramp (CAM-03) | 1160 | 820 | Exit | Exit boom barrier & ramp connector |

---

## 5. Camera Mounting & Coverage Geometry

Physical camera positions are strictly decoupled from operational roles:

| Camera ID | Name / CCTV Label | Designated Role | Mounting (X, Y) | Target (X, Y) | Angle | FOV Arc | Range | Covered Slots / Zones |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **CAM-01** | `B2-Baricade Entry` | `ENTRY` | `(310, 750)` | `(400, 800)` | 35° | 65° | 260 px | Entry barrier, ticketing kiosk, incoming ramp lane |
| **CAM-02** | `B2-Cam 11` | `PARKING_LOT` | `(480, 860)` | `(740, 720)` | -35° | 75° | 520 px | Slots P01, P02, P03, P04, P05 & Central Aisle A |
| **CAM-03** | `B2-Baricade Exit Cam 2`| `EXIT` | `(1100, 900)` | `(740, 1400)` | 195° | 70° | 480 px | Slots P06, P07, P08, P09, P10 & Exit Ramp Barrier |

---

## 6. Mathematical Transformation & Calibration Notes

1. **Pixel-to-Meter Mapping**:
   Scale factor is $1\text{ px} = 0.05\text{ m}$ ($5\text{ cm/px}$).
   A standard stall is $2.50\text{ m} \times 5.00\text{ m}$, which maps to $50 \times 100\text{ px}$. With 62 px width (including painted boundaries) and 95 px depth, the scale is verified against the dimensional strings in the architectural PDF.
2. **Floor-Plan Underlay 1:1 Alignment**:
   The raster image `apps/web/public/parking_exact_l_shape.png` was extracted at native $1255 \times 2155$ resolution from the architectural vector drawing. SVG vector elements directly overlay this raster with 0 px offset.
3. **No Fictional Routes**:
   All Dijkstra edges traverse unobstructed aisles. The TECH PARK core is completely excluded from the navigation graph.
