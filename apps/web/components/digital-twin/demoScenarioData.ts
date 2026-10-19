/**
 * ParkTwin AI — Canonical Demo Scenario & Floor Plan Geometry
 * ==========================================================
 * Architectural Vector Specification matching authoritative blueprint:
 * media_1791002045319.png (Carparking-01 B2).
 *
 * Canvas dimensions: 1472 × 1508
 * All coordinates, cameras, aisles, columns, and bays map 1:1 with the blueprint.
 */

export interface DemoCamera {
  id: string;
  role: "ENTRY" | "PATH/PARKING" | "EXIT";
  x: number;
  y: number;
  label: string;
  locationName: string;
  videoUrl?: string;
  status: "ONLINE" | "STANDBY" | "RESERVED";
}

export interface DemoParkingSpace {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zone: string;
  orientation: "horizontal" | "vertical";
  coveringCamera: string;
}

export interface DemoVehicleConfig {
  id: string;
  plate: string;
  isTypeA: boolean; // Type A = tracked/moving; Type B = static background
  assignedSlot: string;
  color: string;
  model: string;
  entryTime: number; // in seconds
  parkTime: number; // in seconds
  exitStartTime: number; // in seconds
  exitCompleteTime: number; // in seconds
  entryRoute: [number, number][];
  exitRoute: [number, number][];
}

/**
 * Canonical reservation predicate for facility parking bays.
 * Spaces SP-14 and SP-24 (P14, P24) are designated reserved bays.
 */
export function isSlotReserved(
  slot: { id: string; name?: string; isReserved?: boolean } | null | undefined
): boolean {
  if (!slot) return false;
  return (
    slot.id === "SP-14" ||
    slot.id === "SP-24" ||
    slot.id === "P14" ||
    slot.id === "P24" ||
    slot.name === "P14" ||
    slot.name === "P24" ||
    Boolean(slot.isReserved)
  );
}

// ─── 1. ACCESS POINT B2 (Single Physical Gateway) ────────────────────────────
export const ACCESS_POINT_B2 = {
  id: "ACCESS_POINT_B2",
  name: "B2 Vehicle Gateway (Entry & Exit)",
  x: 1105,
  y: 55,
} as const;

// ─── 2. 16 CAMERAS MATCHING BLUEPRINT AISLE VANTAGES ────────────────────────
export const CANONICAL_16_CAMERAS: DemoCamera[] = [
  {
    id: "CAM-01",
    role: "ENTRY",
    x: 1105,
    y: 60,
    label: "Entry Gate / Access Point B2",
    locationName: "B2 Access Point Ramp",
    videoUrl: "/videos/cam1_entry_gate.mp4",
    status: "ONLINE",
  },
  {
    id: "CAM-02",
    role: "PATH/PARKING",
    x: 1225,
    y: 610,
    label: "East Vertical Drive Aisle",
    locationName: "East Vertical Trunk / 2nd Aisle Junction",
    videoUrl: "/videos/cam2_parking_bay.mp4",
    status: "ONLINE",
  },
  {
    id: "CAM-03",
    role: "PATH/PARKING",
    x: 1225,
    y: 1318,
    label: "Southeast Drive Corridor",
    locationName: "East Vertical Trunk / Bottom Aisle Junction",
    videoUrl: "/videos/cam3_exit_ramp.mp4",
    status: "ONLINE",
  },
  {
    id: "CAM-04",
    role: "PATH/PARKING",
    x: 1160,
    y: 1318,
    label: "South Perimeter Corridor East",
    locationName: "South Perimeter Driveway East",
    status: "STANDBY",
  },
  {
    id: "CAM-05",
    role: "PATH/PARKING",
    x: 820,
    y: 960,
    label: "3rd Horizontal Aisle East",
    locationName: "Lower Drive Aisle East",
    status: "STANDBY",
  },
  {
    id: "CAM-06",
    role: "PATH/PARKING",
    x: 550,
    y: 960,
    label: "3rd Horizontal Aisle West",
    locationName: "Lower Drive Aisle West",
    status: "STANDBY",
  },
  {
    id: "CAM-07",
    role: "PATH/PARKING",
    x: 412,
    y: 1318,
    label: "Southwest Corridor Junction",
    locationName: "South Perimeter West Corner",
    status: "STANDBY",
  },
  {
    id: "CAM-08",
    role: "PATH/PARKING",
    x: 344,
    y: 960,
    label: "West Lift Core 02 Junction",
    locationName: "Stair & Lift Core 02 Corner",
    status: "STANDBY",
  },
  {
    id: "CAM-09",
    role: "PATH/PARKING",
    x: 550,
    y: 610,
    label: "2nd Horizontal Aisle West",
    locationName: "Zone C Entry Junction",
    status: "STANDBY",
  },
  {
    id: "CAM-10",
    role: "PATH/PARKING",
    x: 820,
    y: 610,
    label: "2nd Horizontal Aisle Center",
    locationName: "Central Cross Driveway",
    status: "STANDBY",
  },
  {
    id: "CAM-11",
    role: "PATH/PARKING",
    x: 1225,
    y: 960,
    label: "East Services Corridor",
    locationName: "Services & Storage Drive Aisle",
    status: "STANDBY",
  },
  {
    id: "CAM-12",
    role: "PATH/PARKING",
    x: 820,
    y: 250,
    label: "Top Horizontal Aisle Center",
    locationName: "Zone B North Drive Aisle",
    status: "STANDBY",
  },
  {
    id: "CAM-13",
    role: "PATH/PARKING",
    x: 412,
    y: 725,
    label: "West Entry Ramp Junction",
    locationName: "West Aisle Gateway",
    status: "STANDBY",
  },
  {
    id: "CAM-14",
    role: "PATH/PARKING",
    x: 344,
    y: 484,
    label: "West Lift Core 01 Junction",
    locationName: "Stair & Lift Core 01 Corner",
    status: "STANDBY",
  },
  {
    id: "CAM-15",
    role: "PATH/PARKING",
    x: 412,
    y: 250,
    label: "Northwest Perimeter Junction",
    locationName: "Northwest Drive Aisle",
    status: "STANDBY",
  },
  {
    id: "CAM-16",
    role: "EXIT",
    x: 1190,
    y: 120,
    label: "Exit Gate / Access Point B2",
    locationName: "Exit Throttle Lane",
    status: "ONLINE",
  },
];

// ─── 3. 60 UNIFIED OPERATIONAL PARKING SPACES ─────────────────────────────────
export const CANONICAL_60_SPACES: DemoParkingSpace[] = [
  // ─── FOCUSED DEMO ZONE: ISLAND 1 (SP-01 to SP-20) ──────────────────────────
  // North Row (SP-01 to SP-08): 8 vertical stalls facing Top Horizontal Aisle (y=365)
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `SP-${String(i + 1).padStart(2, "0")}`,
    name: `P${String(i + 1).padStart(2, "0")}`,
    x: Math.round(610 + i * 60),
    y: 365,
    width: 48,
    height: 76,
    zone: "Zone B (Upper Island)",
    orientation: "vertical" as const,
    coveringCamera: "CAM-12",
  })),

  // South Row (SP-09 to SP-16): 8 vertical stalls facing 2nd Horizontal Aisle (y=505)
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `SP-${String(9 + i).padStart(2, "0")}`,
    name: `P${String(9 + i).padStart(2, "0")}`,
    x: Math.round(610 + i * 60),
    y: 505,
    width: 48,
    height: 76,
    zone: "Zone B (Upper Island)",
    orientation: "vertical" as const,
    coveringCamera: "CAM-12",
  })),

  // West End (SP-17 to SP-20): 4 horizontal stalls facing West Vertical Trunk (x=530)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `SP-${String(17 + i).padStart(2, "0")}`,
    name: `P${String(17 + i).padStart(2, "0")}`,
    x: 530,
    y: Math.round(340 + i * 60),
    width: 76,
    height: 48,
    zone: "Zone B (Upper Island)",
    orientation: "horizontal" as const,
    coveringCamera: "CAM-09",
  })),

  // ─── BACKGROUND FACILITY SPACES (SP-21 to SP-60) ──────────────────────────
  // Zone A: North Perimeter Row A (13 spaces, SP-21 to SP-33)
  ...Array.from({ length: 13 }, (_, i) => ({
    id: `SP-${String(21 + i).padStart(2, "0")}`,
    name: `P${String(21 + i).padStart(2, "0")}`,
    x: Math.round(230 + i * 65),
    y: 145,
    width: 48,
    height: 76,
    zone: "Zone A (North Perimeter)",
    orientation: "vertical" as const,
    coveringCamera: i < 6 ? "CAM-15" : "CAM-01",
  })),

  // Zone C: Central Ramp Row (10 spaces, SP-34 to SP-43)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `SP-${String(34 + i).padStart(2, "0")}`,
    name: `P${String(34 + i).padStart(2, "0")}`,
    x: Math.round(520 + i * 58),
    y: 718,
    width: 46,
    height: 76,
    zone: "Zone C (Central Ramp Row)",
    orientation: "vertical" as const,
    coveringCamera: "CAM-10",
  })),

  // Zone D: Lower Island (8 spaces, SP-44 to SP-51)
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `SP-${String(44 + i).padStart(2, "0")}`,
    name: `P${String(44 + i).padStart(2, "0")}`,
    x: Math.round(550 + i * 58),
    y: 1065,
    width: 46,
    height: 76,
    zone: "Zone D (Lower Island)",
    orientation: "vertical" as const,
    coveringCamera: "CAM-09",
  })),

  // Zone E: South Perimeter (5 spaces, SP-52 to SP-56)
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `SP-${String(52 + i).padStart(2, "0")}`,
    name: `P${String(52 + i).padStart(2, "0")}`,
    x: Math.round(580 + i * 65),
    y: 1425,
    width: 48,
    height: 76,
    zone: "Zone E (South Perimeter)",
    orientation: "vertical" as const,
    coveringCamera: "CAM-06",
  })),

  // Zone F: West Wing (4 spaces, SP-57 to SP-60)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `SP-${String(57 + i).padStart(2, "0")}`,
    name: `P${String(57 + i).padStart(2, "0")}`,
    x: Math.round(85 + i * 65),
    y: 608,
    width: 50,
    height: 74,
    zone: "Zone F (West Wing)",
    orientation: "vertical" as const,
    coveringCamera: "CAM-08",
  })),
];

// ─── 4. VECTOR SVG FACILITY ARCHITECTURE GEOMETRY (MATCHING BLUEPRINT) ────────
export const FACILITY_SVG_GEOMETRY = {
  viewBox: "0 0 1472 1508",
  width: 1472,
  height: 1508,

  // Outer Building Footprint Boundary with Top Ramp and West Entry
  outerBoundary: `M 45 90
    L 1161 90
    L 1161 0
    L 1290 0
    L 1290 90
    L 1420 90
    L 1420 1490
    L 45 1490
    L 45 776
    L 0 776
    L 0 674
    L 45 674
    Z`,

  // Continuous Brown Asphalt Drive Aisle Network (#5a3d24)
  driveAisles: [
    // Top-Right Ramp Gateway (ACCESS_POINT_B2)
    { id: "entry_ramp_top", d: "M 1161 0 L 1290 0 L 1290 200 L 1161 200 Z" },
    // West Entry Ramp
    { id: "entry_ramp_west", d: "M 0 674 L 345 674 L 345 776 L 0 776 Z" },
    // East Vertical Drive Trunk
    { id: "east_trunk", d: "M 1161 90 L 1290 90 L 1290 1370 L 1161 1370 Z" },
    // West Vertical Drive Trunk
    { id: "west_trunk", d: "M 345 200 L 478 200 L 478 1370 L 345 1370 Z" },
    // Top Horizontal Drive Aisle
    { id: "top_aisle", d: "M 45 200 L 1290 200 L 1290 303 L 45 303 Z" },
    // 2nd Horizontal Drive Aisle
    { id: "second_aisle", d: "M 345 565 L 1290 565 L 1290 657 L 345 657 Z" },
    // 3rd Horizontal Drive Aisle
    { id: "third_aisle", d: "M 345 913 L 1290 913 L 1290 1005 L 345 1005 Z" },
    // Bottom Horizontal Drive Aisle
    { id: "bottom_aisle", d: "M 45 1267 L 1290 1267 L 1290 1370 L 45 1370 Z" },
  ],

  // Structural & Architectural Cores matching the blueprint
  structuralCores: [
    // Upper Stair & Lift Core (West side between Cluster 1 and Cluster 2)
    { id: "lift_stair_upper", x: 45, y: 425, w: 300, h: 118, name: "Stair & Lift Core 01" },
    // Lower Stair & Lift Core (West side between Cluster 3 and Cluster 4)
    { id: "lift_stair_mid", x: 45, y: 906, w: 300, h: 116, name: "Stair & Lift Core 02" },
    // East Services & Storage Room (Blue outline box)
    { id: "services_room", x: 1375, y: 360, w: 85, h: 790, name: "SERVICES / STORAGE" },
    // East Top Lobby (2.8m wide)
    { id: "lobby_top", x: 1375, y: 90, w: 85, h: 210, name: "LOBBY 2.8M WIDE" },
    // East Bottom Lobby (3.0m wide)
    { id: "lobby_bottom", x: 1375, y: 1260, w: 85, h: 200, name: "LOBBY 3.0 WIDE" },
  ],

  // 3 Central Architectural Parking Islands
  islands: [
    { id: "island_1", x: 478, y: 303, w: 683, h: 262 },
    { id: "island_2", x: 478, y: 657, w: 683, h: 256 },
    { id: "island_3", x: 478, y: 1005, w: 683, h: 262 },
  ],

  // West Wing Parking Clusters (4 stalls each)
  westClusters: [
    { id: "west_c1", x: 45, y: 305, w: 300, h: 118 },
    { id: "west_c2", x: 45, y: 545, w: 300, h: 127 },
    { id: "west_c3", x: 45, y: 778, w: 300, h: 126 },
    { id: "west_c4", x: 45, y: 1023, w: 300, h: 128 },
  ],

  // Structural Columns with Yellow Collars at Grid Intersections
  gridColumns: [
    // Top wall line (y = 90)
    { x: 240, y: 90 }, { x: 478, y: 90 }, { x: 820, y: 90 }, { x: 1161, y: 90 },
    // Island 1 columns (top line y=303, bottom line y=565)
    { x: 478, y: 303 }, { x: 820, y: 303 }, { x: 1161, y: 303 },
    { x: 478, y: 565 }, { x: 820, y: 565 }, { x: 1161, y: 565 },
    // Island 2 columns (top line y=657, bottom line y=913)
    { x: 478, y: 657 }, { x: 820, y: 657 }, { x: 1161, y: 657 },
    { x: 478, y: 913 }, { x: 820, y: 913 }, { x: 1161, y: 913 },
    // Island 3 columns (top line y=1005, bottom line y=1267)
    { x: 478, y: 1005 }, { x: 820, y: 1005 }, { x: 1161, y: 1005 },
    { x: 478, y: 1267 }, { x: 820, y: 1267 }, { x: 1161, y: 1267 },
    // West perimeter columns
    { x: 45, y: 305 }, { x: 345, y: 305 },
    { x: 45, y: 425 }, { x: 345, y: 425 },
    { x: 45, y: 545 }, { x: 345, y: 545 },
    { x: 45, y: 672 }, { x: 345, y: 672 },
    { x: 45, y: 778 }, { x: 345, y: 778 },
    { x: 45, y: 906 }, { x: 345, y: 906 },
    { x: 45, y: 1023 }, { x: 345, y: 1023 },
    { x: 45, y: 1151 }, { x: 345, y: 1151 },
    // East perimeter columns (along x = 1290)
    { x: 1290, y: 90 }, { x: 1290, y: 303 }, { x: 1290, y: 565 },
    { x: 1290, y: 657 }, { x: 1290, y: 913 }, { x: 1290, y: 1005 },
    { x: 1290, y: 1267 }, { x: 1290, y: 1370 },
    // Bottom wall line (y = 1480)
    { x: 240, y: 1480 }, { x: 478, y: 1480 }, { x: 820, y: 1480 }, { x: 1161, y: 1480 },
  ],
};

// ─── 5. 30 DETERMINISTIC DEMO VEHICLES (Type A Tracked vs Type B Static) ───────
export const DEMO_30_VEHICLES: DemoVehicleConfig[] = [
  // ─── TYPE A: 10 Tracked / Dynamic Movie Vehicles ───────────────────────────
  // VEH-001: Entry to Island 1 (SP-02) -> Stays -> Exits near end
  {
    id: "VEH-001",
    plate: "DEMO-001",
    isTypeA: true,
    assignedSlot: "SP-02",
    color: "#ef4444", // Red
    model: "Electric Sedan",
    entryTime: 4,
    parkTime: 16,
    exitStartTime: 95,
    exitCompleteTime: 110,
    entryRoute: [
      [1105, 55],   // ACCESS_POINT_B2 (CAM-01)
      [1105, 250],  // Down to Top Horizontal Aisle
      [670, 250],   // Along Top Aisle to SP-02
      [670, 365],   // Bay entrance SP-02
    ],
    exitRoute: [
      [670, 365],   // Leave SP-02
      [670, 250],   // Top Aisle
      [1190, 250],  // Toward Exit
      [1190, 120],  // Pass CAM-16
      [1105, 55],   // Reach ACCESS_POINT_B2 -> Disappear
    ],
  },

  // VEH-002: Entry to Island 1 South Row (SP-14) -> Stays
  {
    id: "VEH-002",
    plate: "DEMO-002",
    isTypeA: true,
    assignedSlot: "SP-14",
    color: "#10b981", // Green
    model: "Compact Hybrid",
    entryTime: 12,
    parkTime: 26,
    exitStartTime: 120,
    exitCompleteTime: 136,
    entryRoute: [
      [1105, 55],   // ACCESS_POINT_B2
      [1105, 250],  // Top Horizontal Aisle
      [1225, 250],  // East Trunk
      [1225, 610],  // 2nd Horizontal Aisle
      [910, 610],   // Approach SP-14
      [910, 505],   // In bay SP-14
    ],
    exitRoute: [
      [910, 505],
      [910, 610],
      [1225, 610],
      [1225, 250],
      [1190, 250],
      [1190, 120],
      [1105, 55],
    ],
  },

  // VEH-003: Entry to Zone C (SP-33)
  {
    id: "VEH-003",
    plate: "DEMO-003",
    isTypeA: true,
    assignedSlot: "SP-33",
    color: "#ef4444", // Red
    model: "Executive SUV",
    entryTime: 22,
    parkTime: 40,
    exitStartTime: 135,
    exitCompleteTime: 154,
    entryRoute: [
      [1105, 55],
      [1225, 120],
      [1225, 610],  // Down East Trunk past CAM-02
      [694, 610],   // Along 2nd Aisle past CAM-10
      [694, 678],   // Park in SP-33
    ],
    exitRoute: [
      [694, 678],
      [694, 610],
      [1225, 610],
      [1225, 120],
      [1105, 55],
    ],
  },

  // VEH-004: Entry to Zone D (SP-44)
  {
    id: "VEH-004",
    plate: "DEMO-004",
    isTypeA: true,
    assignedSlot: "SP-44",
    color: "#10b981", // Green
    model: "City Hatchback",
    entryTime: 32,
    parkTime: 52,
    exitStartTime: 150,
    exitCompleteTime: 172,
    entryRoute: [
      [1105, 55],
      [1225, 120],
      [1225, 960],  // Down East Trunk past CAM-02 & CAM-11
      [724, 960],   // Along 3rd Aisle past CAM-05
      [724, 1025],  // Turn into SP-44
    ],
    exitRoute: [
      [724, 1025],
      [724, 960],
      [1225, 960],
      [1225, 120],
      [1105, 55],
    ],
  },

  // VEH-005: Entry to Zone E (SP-52)
  {
    id: "VEH-005",
    plate: "DEMO-005",
    isTypeA: true,
    assignedSlot: "SP-52",
    color: "#ef4444", // Red
    model: "Crossover EV",
    entryTime: 42,
    parkTime: 65,
    exitStartTime: 165,
    exitCompleteTime: 185,
    entryRoute: [
      [1105, 55],
      [1225, 120],
      [1225, 1318], // Down East Trunk to Bottom Aisle
      [645, 1318],  // Along Bottom Aisle past CAM-04
      [645, 1385],  // Turn into SP-52
    ],
    exitRoute: [
      [645, 1385],
      [645, 1318],
      [1225, 1318],
      [1225, 120],
      [1105, 55],
    ],
  },

  // VEH-006: Entry to Zone A (SP-05)
  {
    id: "VEH-006",
    plate: "DEMO-006",
    isTypeA: true,
    assignedSlot: "SP-05",
    color: "#10b981", // Green
    model: "Station Wagon",
    entryTime: 50,
    parkTime: 66,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1105, 250],
      [490, 250],
      [490, 185],
    ],
    exitRoute: [],
  },

  // VEH-007: Entry to Zone B (SP-16)
  {
    id: "VEH-007",
    plate: "DEMO-007",
    isTypeA: true,
    assignedSlot: "SP-16",
    color: "#ef4444", // Red
    model: "Compact Sedan",
    entryTime: 60,
    parkTime: 75,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1105, 250],
      [730, 250],
      [730, 325],
    ],
    exitRoute: [],
  },

  // VEH-008: Entry to Zone C (SP-37)
  {
    id: "VEH-008",
    plate: "DEMO-008",
    isTypeA: true,
    assignedSlot: "SP-37",
    color: "#10b981", // Green
    model: "Luxury Sedan",
    entryTime: 70,
    parkTime: 90,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1225, 120],
      [1225, 610],
      [926, 610],
      [926, 678],
    ],
    exitRoute: [],
  },

  // VEH-009: Entry to Zone D (SP-47)
  {
    id: "VEH-009",
    plate: "DEMO-009",
    isTypeA: true,
    assignedSlot: "SP-47",
    color: "#ef4444", // Red
    model: "SUV 4x4",
    entryTime: 80,
    parkTime: 104,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1225, 120],
      [1225, 960],
      [898, 960],
      [898, 1025],
    ],
    exitRoute: [],
  },

  // VEH-010: Entry to Zone F (SP-58)
  {
    id: "VEH-010",
    plate: "DEMO-010",
    isTypeA: true,
    assignedSlot: "SP-58",
    color: "#10b981", // Green
    model: "Fleet Van",
    entryTime: 88,
    parkTime: 118,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1105, 250],
      [412, 250],   // Along Top Aisle to Left Trunk
      [412, 610],   // Down Left Trunk to Cluster 2
      [150, 610],   // Turn into bay SP-58
    ],
    exitRoute: [],
  },

  // ─── TYPE B: 20 Static Background Parked Vehicles ─────────────────────────
  // Parked at t=0, no fake driving route or timestamps (All strictly Green or Red)
  ...[
    { id: "VEH-011", slot: "SP-01", color: "#10b981", model: "Sedan" },
    { id: "VEH-012", slot: "SP-03", color: "#ef4444", model: "Hatchback" },
    { id: "VEH-013", slot: "SP-07", color: "#10b981", model: "Crossover" },
    { id: "VEH-014", slot: "SP-09", color: "#ef4444", model: "EV" },
    { id: "VEH-015", slot: "SP-11", color: "#10b981", model: "SUV" },
    { id: "VEH-016", slot: "SP-15", color: "#ef4444", model: "Sedan" },
    { id: "VEH-017", slot: "SP-18", color: "#10b981", model: "Compact" },
    { id: "VEH-018", slot: "SP-20", color: "#ef4444", model: "Hybrid" },
    { id: "VEH-019", slot: "SP-22", color: "#10b981", model: "Sedan" },
    { id: "VEH-020", slot: "SP-25", color: "#ef4444", model: "Wagon" },
    { id: "VEH-021", slot: "SP-32", color: "#10b981", model: "EV" },
    { id: "VEH-022", slot: "SP-35", color: "#ef4444", model: "SUV" },
    { id: "VEH-023", slot: "SP-39", color: "#10b981", model: "Crossover" },
    { id: "VEH-024", slot: "SP-42", color: "#ef4444", model: "Compact" },
    { id: "VEH-025", slot: "SP-45", color: "#10b981", model: "Sedan" },
    { id: "VEH-026", slot: "SP-49", color: "#ef4444", model: "Hatchback" },
    { id: "VEH-027", slot: "SP-53", color: "#10b981", model: "SUV" },
    { id: "VEH-028", slot: "SP-55", color: "#ef4444", model: "Sedan" },
    { id: "VEH-029", slot: "SP-57", color: "#10b981", model: "Van" },
    { id: "VEH-030", slot: "SP-60", color: "#ef4444", model: "Pickup" },
  ].map((s) => ({
    id: s.id,
    plate: s.id.replace("VEH-", "DEMO-"),
    isTypeA: false,
    assignedSlot: s.slot,
    color: s.color,
    model: s.model,
    entryTime: 0,
    parkTime: 0,
    exitStartTime: 999999,
    exitCompleteTime: 999999,
    entryRoute: [] as [number, number][],
    exitRoute: [] as [number, number][],
  })),
];
