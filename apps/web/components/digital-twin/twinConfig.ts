import type { CameraRole, TwinSlotStatus } from "@/types/digitalTwin";

// ─── CANONICAL COORDINATE SYSTEM ─────────────────────────────────────────────
// Source: Floor Plans 03.06.2022.pdf — Page 1 (Level 75.0/78.75 M LVL)
// PDF Points: 1684 × 2384 | Left half (our facility): X ∈ [0, 842], Y ∈ [0, 2384]
// Canonical Facility Coordinates: PDF points (no scale assumption)
// Rendering: Affine transform applied at display layer only

export type VehicleForbiddenRegion = {
  id: string;
  name: string;
  polygon: [number, number][];
  reason: string;
};

export const CANONICAL_COORDS = {
  // Source PDF dimensions
  PDF_WIDTH: 1684,
  PDF_HEIGHT: 2384,
  // Our facility (left half)
  FACILITY_X_MIN: 0,
  FACILITY_X_MAX: 842,
  FACILITY_Y_MIN: 0,
  FACILITY_Y_MAX: 2384,
  // Rendering transform (to be applied at display layer)
  // RENDER_SCALE: 1.0, // No scale assumption - 1 canonical unit = 1 PDF point
  // RENDER_OFFSET_X: 0,
  // RENDER_OFFSET_Y: 0,
} as const;

// ─── FACILITY BOUNDARY (from PDF vector extraction) ──────────────────────────
// L-shaped facility boundary in canonical coordinates (PDF points)
export const FACILITY_BOUNDARY: [number, number][] = [
  [10, 10],           // Top-left outer corner
  [832, 10],          // Top-right (at facility max X ≈ 842)
  [832, 1585],        // Upper-right lobby junction
  [345, 1585],        // Tech Park inner corner
  [345, 2145],        // Tech Park southern corner
  [10, 2145],         // Bottom-left outer corner
];

export const TECH_PARK_CORE: [number, number][] = [
  [345, 1585],
  [832, 1585],
  [832, 2145],
  [345, 2145],
];

// ─── PEDESTRIAN-ONLY / VEHICLE-FORBIDDEN REGIONS ────────────────────────────
// Derived from orange (0.72,0.54,0) and brown (0.45,0.34,0.22) fills
export const VEHICLE_FORBIDDEN_REGIONS: Array<{ id: string; name: string; polygon: [number, number][]; reason: string }> = [
  {
    id: "pedestrian_core_left",
    name: "Left Stair/Elevator Core",
    polygon: [
      [150, 3],
      [313, 3],
      [313, 1028],
      [150, 1028],
    ],
    reason: "Stair/elevator core - pedestrian only",
  },
  {
    id: "pedestrian_service_left",
    name: "Left Service Corridor",
    polygon: [
      [150, 1015],
      [290, 1015],
      [290, 1259],
      [150, 1259],
    ],
    reason: "Service corridor - pedestrian only",
  },
  {
    id: "pedestrian_bottom_left",
    name: "Bottom Left Service Area",
    polygon: [
      [150, 776],
      [194, 776],
      [194, 1682],
      [150, 1682],
    ],
    reason: "Structural/service - pedestrian only",
  },
  {
    id: "structural_core_tech_park",
    name: "Tech Park Structural Core",
    polygon: [
      [217, 783],
      [321, 783],
      [321, 1682],
      [217, 1682],
    ],
    reason: "Structural foundation - vehicle forbidden",
  },
  {
    id: "ramp_core_west",
    name: "West Ramp Core",
    polygon: [
      [372, 613],
      [472, 613],
      [472, 1682],
      [372, 1682],
    ],
    reason: "Ramp void - vehicle forbidden",
  },
  {
    id: "ramp_core_secondary",
    name: "Secondary Ramp Core",
    polygon: [
      [339, 679],
      [372, 679],
      [372, 1682],
      [339, 1682],
    ],
    reason: "Ramp void - vehicle forbidden",
  },
  {
    id: "entry_vestibule",
    name: "Entry Vestibule",
    polygon: [
      [626, 448],
      [785, 448],
      [785, 724],
      [626, 724],
    ],
    reason: "Entry vestibule - restricted",
  },
];

// ─── VEHICLE-ACCESSIBLE NETWORK (Drive Aisles) ──────────────────────────────
// Derived from green/yellow/black stroke lines in PDF
export interface DriveAisle {
  id: string;
  name: string;
  centerline: [number, number][];
  width: number;
  type: "trunk" | "aisle" | "ramp" | "connector";
  direction: "bidirectional" | "one-way";
}

export const DRIVE_AISLES: DriveAisle[] = [
  {
    id: "north_perimeter",
    name: "North Perimeter Lane",
    centerline: [[644, 138], [706, 138]], // Approx center of green stroke at Y≈138
    width: 68,
    type: "aisle",
    direction: "bidirectional",
  },
  {
    id: "main_west_trunk",
    name: "Main West Driving Trunk",
    centerline: [[438, 138], [438, 1585]], // Blue vertical line at X=438
    width: 80,
    type: "trunk",
    direction: "bidirectional",
  },
  {
    id: "upper_west_aisle",
    name: "Upper West Aisle",
    centerline: [[701, 800], [817, 800]], // Yellow stroke at Y≈800
    width: 75,
    type: "aisle",
    direction: "bidirectional",
  },
  {
    id: "mid_west_aisle",
    name: "Mid West Aisle",
    centerline: [[701, 1361], [823, 1361]], // Yellow stroke at Y≈1361
    width: 75,
    type: "aisle",
    direction: "bidirectional",
  },
  {
    id: "lower_mid_aisle",
    name: "Lower Mid Aisle",
    centerline: [[710, 1420], [815, 1420]], // Black stroke at Y≈1420
    width: 70,
    type: "aisle",
    direction: "bidirectional",
  },
  {
    id: "south_exit_aisle",
    name: "South Exit Aisle",
    centerline: [[710, 1567], [874, 1567]], // Magenta stroke at Y≈1567
    width: 65,
    type: "connector",
    direction: "bidirectional",
  },
  {
    id: "vertical_connector_west",
    name: "West Vertical Connector",
    centerline: [[438, 138], [438, 1585]], // Blue line at X=438
    width: 10,
    type: "trunk",
    direction: "bidirectional",
  },
  {
    id: "vertical_connector_east",
    name: "East Vertical Connector",
    centerline: [[815, 138], [815, 1585]], // Black line at X=815
    width: 10,
    type: "trunk",
    direction: "bidirectional",
  },
];

// ─── PARKING SPACES (58 candidates from PDF extraction) ──────────────────────
export interface PhysicalParkingSpace {
  id: string;
  pdfCenter: { x: number; y: number };
  orientation: "horizontal" | "vertical";
  zone: string;
  block: string;
  confidence: "VERIFIED" | "HIGH_CONFIDENCE" | "MEDIUM_CONFIDENCE" | "UNVERIFIED";
  vehicleAccessible: boolean;
  // Runtime mapping (optional)
  runtimeSlotId?: string; // e.g., "P01" if mapped
  // Geometry
  width: number; // PDF points (~9)
  height: number; // PDF points (~9)
  orientationDegrees: number; // 0 = North, 180 = South, 90 = East, 270 = West
}

// Row definitions from PDF extraction (canonical coordinates = PDF points)
const PARKING_ROWS = [
  {
    block: "north_perimeter",
    zone: "Zone A",
    y: 108,
    spaces: [
      { x: 648, orientation: "vertical" as const },
      { x: 706, orientation: "vertical" as const },
      { x: 763, orientation: "vertical" as const },
      { x: 821, orientation: "vertical" as const },
    ],
  },
  {
    block: "upper_west_bay",
    zone: "Zone B",
    y: 800,
    spaces: [
      { x: 476, orientation: "vertical" as const, paired: true },
      { x: 591, orientation: "vertical" as const, paired: true },
      { x: 648, orientation: "vertical" as const, paired: true },
      { x: 706, orientation: "vertical" as const, paired: true },
    ],
  },
  {
    block: "upper_west_bay",
    zone: "Zone B",
    y: 857,
    spaces: [
      { x: 476, orientation: "vertical" as const, paired: true },
      { x: 591, orientation: "vertical" as const, paired: true },
      { x: 648, orientation: "vertical" as const, paired: true },
      { x: 706, orientation: "vertical" as const, paired: true },
    ],
  },
  {
    block: "mid_west_bay",
    zone: "Zone C",
    y: 1359,
    spaces: [
      { x: 476, orientation: "horizontal" as const, paired: true },
      { x: 591, orientation: "vertical" as const, paired: true },
      { x: 648, orientation: "vertical" as const, paired: true },
      { x: 706, orientation: "vertical" as const, paired: true },
    ],
  },
  {
    block: "mid_west_bay",
    zone: "Zone C",
    y: 1417,
    spaces: [
      { x: 476, orientation: "horizontal" as const, paired: true },
      { x: 591, orientation: "vertical" as const, paired: true },
      { x: 648, orientation: "vertical" as const, paired: true },
      { x: 706, orientation: "vertical" as const, paired: true },
    ],
  },
  {
    block: "lower_mid_bay",
    zone: "Zone D",
    y: 1474,
    spaces: [
      { x: 648, orientation: "vertical" as const },
      { x: 706, orientation: "vertical" as const },
    ],
  },
  {
    block: "south_perimeter",
    zone: "Zone E",
    y: 1589,
    spaces: [
      { x: 648, orientation: "vertical" as const },
      { x: 706, orientation: "vertical" as const },
      { x: 763, orientation: "vertical" as const },
      { x: 821, orientation: "vertical" as const },
    ],
  },
];

// Scattered/perimeter spaces (10 spaces - MEDIUM_CONFIDENCE)
const SCATTERED_SPACES = [
  { block: "perimeter", zone: "Zone A", x: 460, y: 680, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
  { block: "perimeter", zone: "Zone A", x: 520, y: 680, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
  { block: "perimeter", zone: "Zone A", x: 580, y: 680, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
  { block: "perimeter", zone: "Zone A", x: 640, y: 680, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
  { block: "perimeter", zone: "Zone A", x: 700, y: 680, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
  { block: "perimeter", zone: "Zone E", x: 460, y: 1510, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
  { block: "perimeter", zone: "Zone E", x: 520, y: 1510, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
  { block: "perimeter", zone: "Zone E", x: 580, y: 1510, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
  { block: "perimeter", zone: "Zone E", x: 640, y: 1510, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
  { block: "perimeter", zone: "Zone E", x: 700, y: 1510, orientation: "vertical" as const, confidence: "MEDIUM_CONFIDENCE" as const },
];

// 6 Unverified Candidates (Pre-Phase-3 Reconciliation Gate)
const UNVERIFIED_CANDIDATE_SPACES = [
  { block: "lower_mid_bay", zone: "Zone D", x: 763, y: 1474, orientation: "vertical" as const, confidence: "UNVERIFIED" as const, reason: "Unconfirmed Zone D East extension" },
  { block: "lower_mid_bay", zone: "Zone D", x: 821, y: 1474, orientation: "vertical" as const, confidence: "UNVERIFIED" as const, reason: "Unconfirmed Zone D East extension" },
  { block: "north_perimeter", zone: "Zone A", x: 530, y: 108, orientation: "vertical" as const, confidence: "UNVERIFIED" as const, reason: "Unconfirmed Zone A West transition" },
  { block: "north_perimeter", zone: "Zone A", x: 589, y: 108, orientation: "vertical" as const, confidence: "UNVERIFIED" as const, reason: "Unconfirmed Zone A West transition" },
  { block: "upper_west_bay", zone: "Zone B", x: 740, y: 800, orientation: "vertical" as const, confidence: "UNVERIFIED" as const, reason: "Unconfirmed Zone B Core boundary" },
  { block: "upper_west_bay", zone: "Zone B", x: 740, y: 857, orientation: "vertical" as const, confidence: "UNVERIFIED" as const, reason: "Unconfirmed Zone B Core boundary" },
];

// Build complete parking space inventory (58 physical spaces)
function buildParkingSpaces(): PhysicalParkingSpace[] {
  const spaces: PhysicalParkingSpace[] = [];
  let spaceIndex = 0;

  // Structured rows (42 spaces - HIGH_CONFIDENCE)
  for (const row of PARKING_ROWS) {
    for (const s of row.spaces) {
      const isPaired = (s as { paired?: boolean }).paired === true;
      const isVertical = s.orientation === "vertical";
      const w = isVertical ? 44 : 68;
      const h = isVertical ? 68 : 44;

      if (isPaired) {
        // Upper stall
        spaces.push({
          id: `PHYS_${String(++spaceIndex).padStart(3, "0")}`,
          pdfCenter: { x: s.x, y: row.y - (isVertical ? 36 : 0) },
          orientation: s.orientation,
          zone: row.zone,
          block: row.block,
          confidence: "HIGH_CONFIDENCE",
          vehicleAccessible: true,
          width: w,
          height: h,
          orientationDegrees: isVertical ? 180 : 90,
        });
        // Lower stall
        spaces.push({
          id: `PHYS_${String(++spaceIndex).padStart(3, "0")}`,
          pdfCenter: { x: s.x, y: row.y + (isVertical ? 36 : 0) },
          orientation: s.orientation,
          zone: row.zone,
          block: row.block,
          confidence: "HIGH_CONFIDENCE",
          vehicleAccessible: true,
          width: w,
          height: h,
          orientationDegrees: isVertical ? 0 : 270,
        });
      } else {
        spaces.push({
          id: `PHYS_${String(++spaceIndex).padStart(3, "0")}`,
          pdfCenter: { x: s.x, y: row.y },
          orientation: s.orientation,
          zone: row.zone,
          block: row.block,
          confidence: "HIGH_CONFIDENCE",
          vehicleAccessible: true,
          width: w,
          height: h,
          orientationDegrees: isVertical ? 180 : 90,
        });
      }
    }
  }

  // Scattered spaces (10 spaces - MEDIUM_CONFIDENCE)
  for (const s of SCATTERED_SPACES) {
    const isVertical = s.orientation === "vertical";
    spaces.push({
      id: `PHYS_${String(++spaceIndex).padStart(3, "0")}`,
      pdfCenter: { x: s.x, y: s.y },
      orientation: s.orientation,
      zone: s.zone,
      block: s.block,
      confidence: s.confidence,
      vehicleAccessible: true,
      width: isVertical ? 44 : 68,
      height: isVertical ? 68 : 44,
      orientationDegrees: isVertical ? 180 : 90,
    });
  }

  // 6 Unverified Candidates (UNVERIFIED)
  for (const s of UNVERIFIED_CANDIDATE_SPACES) {
    const isVertical = s.orientation === "vertical";
    spaces.push({
      id: `PHYS_${String(++spaceIndex).padStart(3, "0")}`,
      pdfCenter: { x: s.x, y: s.y },
      orientation: s.orientation,
      zone: s.zone,
      block: s.block,
      confidence: s.confidence,
      vehicleAccessible: false,
      width: isVertical ? 44 : 68,
      height: isVertical ? 68 : 44,
      orientationDegrees: isVertical ? 180 : 90,
    });
  }

  return spaces;
}

export const PHYSICAL_PARKING_SPACES = buildParkingSpaces();

// ─── PARKING ZONES ──────────────────────────────────────────────────────────
export const PARKING_ZONES = [
  { id: "Zone A", name: "North Perimeter", blocks: ["north_perimeter", "perimeter"], color: "#3b82f6" },
  { id: "Zone B", name: "Upper West Bay", blocks: ["upper_west_bay"], color: "#10b981" },
  { id: "Zone C", name: "Mid West Bay", blocks: ["mid_west_bay"], color: "#f59e0b" },
  { id: "Zone D", name: "Lower Mid Bay", blocks: ["lower_mid_bay"], color: "#ef4444" },
  { id: "Zone E", name: "South Perimeter", blocks: ["south_perimeter"], color: "#8b5cf6" },
  { id: "Perimeter", name: "Perimeter/Transition", blocks: ["perimeter"], color: "#64748b" },
] as const;

// ─── RUNTIME SLOT MAPPING (P01-P10 → Physical Spaces) ───────────────────────
// Runtime slots mapped 1:1 to verified physical bays
export const RUNTIME_TO_PHYSICAL_MAP: Record<string, string> = {
  "P01": "PHYS_001",
  "P02": "PHYS_002",
  "P03": "PHYS_003",
  "P04": "PHYS_004",
  "P05": "PHYS_005",
  "P06": "PHYS_006",
  "P07": "PHYS_007",
  "P08": "PHYS_008",
  "P09": "PHYS_009",
  "P10": "PHYS_010",
} as const;

// ─── CANONICAL CAMERA REGISTRY (16 cameras - LOCKED) ─────────────────────────
export const CANONICAL_CAMERAS = [
  { id: "CAM-01", name: "B2 Entrance Gate", role: "ENTRY" as CameraRole, status: "CONFIGURED" as const, source: "/videos/cam1_entry_gate.mp4", verifiedPosition: { x: 310, y: 750 } },
  { id: "CAM-02", name: "B2 Parking Bays", role: "PATH_PARKING" as CameraRole, status: "CONFIGURED" as const, source: "/videos/cam2_parking_bay.mp4", verifiedPosition: { x: 480, y: 860 } },
  { id: "CAM-03", name: "B2-Baricade Exit Cam 2", role: "PATH_PARKING" as CameraRole, status: "CONFIGURED" as const, source: "/videos/cam3_exit_ramp.mp4", verifiedPosition: { x: 740, y: 1400 } },
  { id: "CAM-04", name: "B2 Zone C West", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-05", name: "B2 Zone C East", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-06", name: "B2 Zone D North", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-07", name: "B2 Zone D South", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-08", name: "B2 Perimeter North", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-09", name: "B2 Perimeter South", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-10", name: "B2 Service Corridor", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-11", name: "B2 Ramp Upper", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-12", name: "B2 Ramp Lower", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-13", name: "B2 Zone E East", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-14", name: "B2 Zone E West", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-15", name: "B2 Tech Park View", role: "PATH_PARKING" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
  { id: "CAM-16", name: "B2 Exit Gate", role: "EXIT" as CameraRole, status: "NOT_CONFIGURED" as const, source: null, verifiedPosition: null },
] as const;

// ─── ACCESS POINT (Single Physical Gateway) ──────────────────────────────────
export const ACCESS_POINT_B2 = {
  id: "ACCESS_POINT_B2",
  name: "B2 Vehicle Access Point",
  location: "UNVERIFIED" as const,
  candidates: [
    { id: "north_ramp", label: "North Ramp Opening", x: 706, y: 138 },
    { id: "south_ramp", label: "South Ramp Opening", x: 792, y: 1567 },
  ],
  operationalDirections: ["ENTRY", "EXIT"] as const,
  cameraEntry: "CAM-01",
  cameraExit: "CAM-16",
} as const;

// ─── NAVIGATION GRAPH FOUNDATION ────────────────────────────────────────────
export interface NavNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: "entry" | "exit" | "junction" | "aisle" | "slot" | "access_point";
  vehicleAccessible: boolean;
}

// Navigation edges connecting nodes (for pathfinding)
export interface NavEdge {
  from: string;
  to: string;
  bidirectional: boolean;
  aisleId: string; // Reference to drive aisle
}

export const NAV_NODES: NavNode[] = [
  { id: "ACCESS_POINT_B2", name: "B2 Access Point", x: 706, y: 138, type: "access_point", vehicleAccessible: true },
  { id: "NORTH_JUNCTION", name: "North Junction", x: 706, y: 180, type: "junction", vehicleAccessible: true },
  { id: "UPPER_WEST_JUNCTION", name: "Upper West Junction", x: 706, y: 800, type: "junction", vehicleAccessible: true },
  { id: "MID_WEST_JUNCTION", name: "Mid West Junction", x: 706, y: 1361, type: "junction", vehicleAccessible: true },
  { id: "LOWER_MID_JUNCTION", name: "Lower Mid Junction", x: 706, y: 1420, type: "junction", vehicleAccessible: true },
  { id: "SOUTH_JUNCTION", name: "South Junction", x: 792, y: 1567, type: "junction", vehicleAccessible: true },
  { id: "WEST_TRUNK_NORTH", name: "West Trunk North", x: 438, y: 180, type: "aisle", vehicleAccessible: true },
  { id: "WEST_TRUNK_SOUTH", name: "West Trunk South", x: 438, y: 1585, type: "aisle", vehicleAccessible: true },
  // Additional junction nodes to connect east side properly
  { id: "EAST_UPPER_JUNCTION", name: "East Upper Junction", x: 815, y: 180, type: "junction", vehicleAccessible: true },
  { id: "EAST_MID_JUNCTION", name: "East Mid Junction", x: 815, y: 857, type: "junction", vehicleAccessible: true },
  { id: "EAST_LOWER_JUNCTION", name: "East Lower Junction", x: 815, y: 1417, type: "junction", vehicleAccessible: true },
  { id: "EAST_SOUTH_JUNCTION", name: "East South Junction", x: 815, y: 1585, type: "junction", vehicleAccessible: true },
];

export const NAV_EDGES: NavEdge[] = [
  // North entry trunk
  { from: "ACCESS_POINT_B2", to: "NORTH_JUNCTION", bidirectional: true, aisleId: "aisle_north_entry" },
  // West vertical trunk (main artery)
  { from: "NORTH_JUNCTION", to: "UPPER_WEST_JUNCTION", bidirectional: true, aisleId: "aisle_vertical_west" },
  { from: "UPPER_WEST_JUNCTION", to: "MID_WEST_JUNCTION", bidirectional: true, aisleId: "aisle_vertical_west" },
  { from: "MID_WEST_JUNCTION", to: "LOWER_MID_JUNCTION", bidirectional: true, aisleId: "aisle_vertical_west" },
  { from: "LOWER_MID_JUNCTION", to: "WEST_TRUNK_SOUTH", bidirectional: true, aisleId: "aisle_vertical_west" },
  // West trunk horizontal connections
  { from: "NORTH_JUNCTION", to: "WEST_TRUNK_NORTH", bidirectional: true, aisleId: "upper_west_aisle" },
  { from: "WEST_TRUNK_NORTH", to: "UPPER_WEST_JUNCTION", bidirectional: true, aisleId: "mid_west_aisle" },
  { from: "UPPER_WEST_JUNCTION", to: "LOWER_MID_JUNCTION", bidirectional: true, aisleId: "mid_west_aisle" },
  { from: "LOWER_MID_JUNCTION", to: "WEST_TRUNK_SOUTH", bidirectional: true, aisleId: "lower_mid_aisle" },
  // East vertical trunk (avoiding ramp_core_east by stopping before it)
  { from: "NORTH_JUNCTION", to: "EAST_UPPER_JUNCTION", bidirectional: true, aisleId: "aisle_vertical_east_north" },
  { from: "EAST_UPPER_JUNCTION", to: "EAST_MID_JUNCTION", bidirectional: true, aisleId: "aisle_vertical_east_mid" },
  { from: "EAST_MID_JUNCTION", to: "EAST_LOWER_JUNCTION", bidirectional: true, aisleId: "aisle_vertical_east_mid" },
  { from: "EAST_LOWER_JUNCTION", to: "EAST_SOUTH_JUNCTION", bidirectional: true, aisleId: "aisle_vertical_east_south" },
  // South exit connector
  { from: "WEST_TRUNK_SOUTH", to: "SOUTH_JUNCTION", bidirectional: true, aisleId: "aisle_horizontal_lower" },
  { from: "EAST_SOUTH_JUNCTION", to: "SOUTH_JUNCTION", bidirectional: true, aisleId: "south_exit_aisle" },
];

// Compatibility exports
export const FACILITY_NAV_NODES: Record<string, NavNode> = Object.fromEntries(NAV_NODES.map(n => [n.id, n]));

// ─── CONFIDENCE MODEL ────────────────────────────────────────────────────────
export type ConfidenceLevel = "VERIFIED" | "HIGH_CONFIDENCE" | "MEDIUM_CONFIDENCE" | "UNVERIFIED" | "NOT_CONFIGURED";

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  VERIFIED: "#10b981",
  HIGH_CONFIDENCE: "#34d399",
  MEDIUM_CONFIDENCE: "#f59e0b",
  UNVERIFIED: "#64748b",
  NOT_CONFIGURED: "#94a3b8",
};

// ─── COMPATIBILITY EXPORTS (for existing components) ─────────────────────────
// These maintain backward compatibility while we migrate
export const TWIN_CANVAS_WIDTH = 740;
export const TWIN_CANVAS_HEIGHT = 380;
export const SLOT_W = 96;
export const SLOT_H = 62;
export const SLOT_GAP = 14;
export const ROW_A_Y = 52;
export const ROW_B_Y = 244;
export const ROW_START_X = 70;
export const LANE_Y_MID = 160;
export const ENTRY_X = 80;
export const EXIT_X = 600;
export const ZONES = ["A", "B"] as const;
export const SLOTS_PER_ROW = 5;

export const ARCH_CANVAS_WIDTH = 1255;
export const ARCH_CANVAS_HEIGHT = 2155;
export const TWIN_VIEWBOX = `0 0 ${ARCH_CANVAS_WIDTH} ${ARCH_CANVAS_HEIGHT}`;
export const FACILITY_ASPECT_RATIO = ARCH_CANVAS_WIDTH / ARCH_CANVAS_HEIGHT;

// Legacy slot anchors (P01-P10) - maintained for backward compatibility
export interface SlotAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
  zone: string;
  orientation: number;
}

export const CALIBRATED_SLOT_ANCHORS: Record<string, SlotAnchor> = {
  P01: { x: 560, y: 720, width: 62, height: 95, zone: "Zone A", orientation: 180 },
  P02: { x: 650, y: 720, width: 62, height: 95, zone: "Zone A", orientation: 180 },
  P03: { x: 740, y: 720, width: 62, height: 95, zone: "Zone A", orientation: 180 },
  P04: { x: 830, y: 720, width: 62, height: 95, zone: "Zone A", orientation: 180 },
  P05: { x: 920, y: 720, width: 62, height: 95, zone: "Zone A", orientation: 180 },
  P06: { x: 560, y: 1480, width: 62, height: 95, zone: "Zone B", orientation: 0 },
  P07: { x: 650, y: 1480, width: 62, height: 95, zone: "Zone B", orientation: 0 },
  P08: { x: 740, y: 1480, width: 62, height: 95, zone: "Zone B", orientation: 0 },
  P09: { x: 830, y: 1480, width: 62, height: 95, zone: "Zone B", orientation: 0 },
  P10: { x: 920, y: 1480, width: 62, height: 95, zone: "Zone B", orientation: 0 },
};

export function getSlotAnchor(slotId: string): SlotAnchor {
  if (CALIBRATED_SLOT_ANCHORS[slotId]) {
    return CALIBRATED_SLOT_ANCHORS[slotId];
  }
  const match = slotId.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 1;
  if (num >= 11 && num <= 17) {
    const idx = num - 11;
    return { x: 55, y: 1460 + idx * 95, width: 90, height: 60, zone: "Zone C", orientation: 90 };
  } else if (num >= 18 && num <= 24) {
    const idx = num - 18;
    return { x: 285, y: 1460 + idx * 95, width: 90, height: 60, zone: "Zone C", orientation: 270 };
  } else {
    const idx = (num - 1) % 10;
    return { x: 80 + idx * 90, y: 80, width: 60, height: 90, zone: "Zone N", orientation: 180 };
  }
}

// Legacy camera configs (CAM-01..03 only for backward compatibility)
export const DEFAULT_CAMERA_CONFIGS: Record<string, {
  name: string;
  defaultRole: CameraRole;
  zone: string;
  x: number;
  y: number;
  angle: number;
  fov: number;
  coverage_slots: string[];
  url: string;
}> = {
  "CAM-01": { name: "B2 Entrance Gate", defaultRole: "ENTRY", zone: "entrance", x: 310, y: 750, angle: 35, fov: 65, coverage_slots: [], url: "/videos/cam1_entry_gate.mp4" },
  "CAM-02": { name: "B2 Parking Bays", defaultRole: "PATH_PARKING", zone: "parking", x: 480, y: 860, angle: -35, fov: 75, coverage_slots: ["P01", "P02", "P03", "P04", "P05"], url: "/videos/cam2_parking_bay.mp4" },
  "CAM-03": { name: "B2-Baricade Exit Cam 2", defaultRole: "PATH_PARKING", zone: "parking", x: 740, y: 1400, angle: 195, fov: 70, coverage_slots: ["P06", "P07", "P08", "P09", "P10"], url: "/videos/cam3_exit_ramp.mp4" },
};

// Legacy status colors
export const STATUS_COLORS: Record<TwinSlotStatus, { fill: string; stroke: string; text: string; bg: string }> = {
  free: { fill: "rgba(16, 185, 129, 0.18)", stroke: "#10b981", text: "#34d399", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  occupied: { fill: "rgba(239, 68, 68, 0.22)", stroke: "#ef4444", text: "#f87171", bg: "bg-rose-500/10 border-rose-500/30 text-rose-400" },
  reserved: { fill: "rgba(245, 158, 11, 0.20)", stroke: "#f59e0b", text: "#fbbf24", bg: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  violation: { fill: "rgba(234, 179, 8, 0.25)", stroke: "#eab308", text: "#fde047", bg: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
  unknown: { fill: "rgba(100, 116, 139, 0.15)", stroke: "#64748b", text: "#94a3b8", bg: "bg-slate-500/10 border-slate-500/30 text-slate-400" },
};

// ─── 3D COLORS (for TwinCanvas3D compatibility) ────────────────────────────────
// Maps TwinSlotStatus to Three.js compatible hex colors (numbers, not strings)
export const STATUS_3D_COLORS: Record<TwinSlotStatus, number> = {
  free: 0x10b981,
  occupied: 0xef4444,
  reserved: 0xf59e0b,
  violation: 0xeab308,
  unknown: 0x64748b,
};

// ─── 3D POSITIONS (for TwinCanvas3D compatibility) ─────────────────────────────
// Maps legacy P01-P10 to 3D world coordinates (world units: ~10 units wide × 6.4 deep)
// Based on CALIBRATED_SLOT_ANCHORS 2D positions, converted to 3D space
export const SLOT_3D_POSITIONS: Record<string, { x: number; z: number }> = {
  P01: { x: -3.6, z: -2.4 },
  P02: { x: -1.8, z: -2.4 },
  P03: { x: 0.0, z: -2.4 },
  P04: { x: 1.8, z: -2.4 },
  P05: { x: 3.6, z: -2.4 },
  P06: { x: -3.6, z: 2.4 },
  P07: { x: -1.8, z: 2.4 },
  P08: { x: 0.0, z: 2.4 },
  P09: { x: 1.8, z: 2.4 },
  P10: { x: 3.6, z: 2.4 },
};

// Legacy slot position helper
export function getSlotPosition(slotId: string): { x: number; y: number } {
  if (!slotId) return { x: 0, y: 0 };
  let row = "A";
  let num = 1;
  const matchAB = slotId.match(/^([AB])(\d{2})$/i);
  const matchP = slotId.match(/^P(\d{2})$/i);
  if (matchAB && matchAB[1] && matchAB[2]) {
    row = matchAB[1].toUpperCase();
    num = parseInt(matchAB[2], 10);
  } else if (matchP && matchP[1]) {
    const rawNum = parseInt(matchP[1], 10);
    if (rawNum > 5) { row = "B"; num = rawNum - 5; }
    else { row = "A"; num = rawNum; }
  } else { return { x: 0, y: 0 }; }
  if (isNaN(num) || num < 1 || num > SLOTS_PER_ROW) return { x: 0, y: 0 };
  const index = num - 1;
  const x = ROW_START_X + index * (SLOT_W + SLOT_GAP);
  const y = row === "A" ? ROW_A_Y : ROW_B_Y;
  return { x, y };
}