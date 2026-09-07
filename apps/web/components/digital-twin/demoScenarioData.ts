/**
 * ParkTwin AI — Canonical Demo Scenario & Floor Plan Geometry
 * ==========================================================
 * Derived directly from authoritative user floor plan reference:
 * "WhatsApp Image 2026-09-06 at 8.27.12 PM.jpeg"
 *
 * Canvas dimensions: 1472 × 1508
 * All coordinates, cameras, and bays map 1:1 with the user drawing.
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

// ─── 1. ACCESS POINT B2 (Single Physical Gateway) ────────────────────────────
export const ACCESS_POINT_B2 = {
  id: "ACCESS_POINT_B2",
  name: "B2 Vehicle Gateway (Entry & Exit)",
  x: 1105,
  y: 55,
} as const;

// ─── 2. 16 CAMERAS VERIFIED FROM USER DRAWING ────────────────────────────────
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
    x: 1204,
    y: 644,
    label: "East Vertical Drive Aisle",
    locationName: "Corridor East (North-South)",
    videoUrl: "/videos/cam2_parking_bay.mp4",
    status: "ONLINE",
  },
  {
    id: "CAM-03",
    role: "PATH/PARKING",
    x: 1162,
    y: 1291,
    label: "South Perimeter Corridor",
    locationName: "South Perimeter Driveway",
    videoUrl: "/videos/cam3_exit_ramp.mp4",
    status: "ONLINE",
  },
  {
    id: "CAM-04",
    role: "PATH/PARKING",
    x: 1208,
    y: 1208,
    label: "Southeast Corner Junction",
    locationName: "Corridor Turn East-South",
    status: "STANDBY",
  },
  {
    id: "CAM-05",
    role: "PATH/PARKING",
    x: 863,
    y: 1091,
    label: "Lower Horizontal Aisle East",
    locationName: "Lower Drive Aisle East",
    status: "STANDBY",
  },
  {
    id: "CAM-06",
    role: "PATH/PARKING",
    x: 661,
    y: 1090,
    label: "Lower Horizontal Aisle West",
    locationName: "Lower Drive Aisle West",
    status: "STANDBY",
  },
  {
    id: "CAM-07",
    role: "PATH/PARKING",
    x: 493,
    y: 1274,
    label: "Southwest Corridor Junction",
    locationName: "South Perimeter West Corner",
    status: "STANDBY",
  },
  {
    id: "CAM-08",
    role: "PATH/PARKING",
    x: 439,
    y: 1005,
    label: "Mid-West Lift Core Corner",
    locationName: "Lift Core Intersection",
    status: "STANDBY",
  },
  {
    id: "CAM-09",
    role: "PATH/PARKING",
    x: 546,
    y: 937,
    label: "Lower-Mid Bay Island West",
    locationName: "Zone D Entry Junction",
    status: "STANDBY",
  },
  {
    id: "CAM-10",
    role: "PATH/PARKING",
    x: 826,
    y: 596,
    label: "Central Ramp Drive Corridor",
    locationName: "Central Ramp Driveway",
    status: "STANDBY",
  },
  {
    id: "CAM-11",
    role: "PATH/PARKING",
    x: 440,
    y: 549,
    label: "Services Room Corridor",
    locationName: "Services Room Drive Aisle",
    status: "STANDBY",
  },
  {
    id: "CAM-12",
    role: "PATH/PARKING",
    x: 543,
    y: 427,
    label: "Upper-Mid Bay Island West",
    locationName: "Zone B West Perimeter",
    status: "STANDBY",
  },
  {
    id: "CAM-13",
    role: "PATH/PARKING",
    x: 210,
    y: 1189,
    label: "Far Southwest Extension Wing",
    locationName: "Southwest Wing Corridor",
    status: "STANDBY",
  },
  {
    id: "CAM-14",
    role: "PATH/PARKING",
    x: 430,
    y: 394,
    label: "Upper Lift Core Corridor",
    locationName: "Upper Lift Access Lane",
    status: "STANDBY",
  },
  {
    id: "CAM-15",
    role: "PATH/PARKING",
    x: 440,
    y: 290,
    label: "Northwest Perimeter Corridor",
    locationName: "Northwest Drive Aisle",
    status: "STANDBY",
  },
  {
    id: "CAM-16",
    role: "EXIT",
    x: 1022,
    y: 191,
    label: "Exit Gate / Access Point B2",
    locationName: "Exit Throttle Lane",
    status: "ONLINE",
  },
];

// ─── 3. 60 UNIFIED PARKING SPACES ─────────────────────────────────────────────
export const CANONICAL_60_SPACES: DemoParkingSpace[] = [
  // Zone A: North Perimeter (13 spaces, SP-01 to SP-13)
  ...Array.from({ length: 13 }, (_, i) => ({
    id: `SP-${String(i + 1).padStart(2, "0")}`,
    name: `P${String(i + 1).padStart(2, "0")}`,
    x: Math.round(245 + i * 61.5),
    y: 108,
    width: 48,
    height: 72,
    zone: "Zone A (North Perimeter)",
    orientation: "vertical" as const,
    coveringCamera: i < 6 ? "CAM-15" : "CAM-01",
  })),

  // Zone B: Upper Island (16 spaces, SP-14 to SP-29)
  ...[
    // Row 1 (y=230)
    { id: "SP-14", x: 615, y: 230 },
    { id: "SP-15", x: 675, y: 230 },
    { id: "SP-16", x: 875, y: 230 },
    { id: "SP-17", x: 935, y: 230 },
    // Row 2 (y=290)
    { id: "SP-18", x: 615, y: 290 },
    { id: "SP-19", x: 675, y: 290 },
    { id: "SP-20", x: 875, y: 290 },
    { id: "SP-21", x: 935, y: 290 },
    // Row 3 (y=350)
    { id: "SP-22", x: 615, y: 350 },
    { id: "SP-23", x: 675, y: 350 },
    { id: "SP-24", x: 875, y: 350 },
    { id: "SP-25", x: 935, y: 350 },
    // Row 4 (y=410)
    { id: "SP-26", x: 615, y: 410 },
    { id: "SP-27", x: 675, y: 410 },
    { id: "SP-28", x: 875, y: 410 },
    { id: "SP-29", x: 935, y: 410 },
  ].map((b) => ({
    id: b.id,
    name: b.id.replace("SP-", "P"),
    x: b.x,
    y: b.y,
    width: 54,
    height: 44,
    zone: "Zone B (Upper Island)",
    orientation: "horizontal" as const,
    coveringCamera: "CAM-12",
  })),

  // Zone C: Central Ramp Row (11 spaces, SP-30 to SP-40)
  ...Array.from({ length: 11 }, (_, i) => ({
    id: `SP-${String(30 + i).padStart(2, "0")}`,
    name: `P${String(30 + i).padStart(2, "0")}`,
    x: Math.round(580 + i * 50),
    y: 430,
    width: 42,
    height: 68,
    zone: "Zone C (Central Ramp Row)",
    orientation: "vertical" as const,
    coveringCamera: "CAM-10",
  })),

  // Zone D: Lower Island (10 spaces, SP-41 to SP-50)
  ...[
    { id: "SP-41", x: 615, y: 900 },
    { id: "SP-42", x: 675, y: 900 },
    { id: "SP-43", x: 875, y: 900 },
    { id: "SP-44", x: 935, y: 900 },
    { id: "SP-45", x: 615, y: 960 },
    { id: "SP-46", x: 675, y: 960 },
    { id: "SP-47", x: 875, y: 960 },
    { id: "SP-48", x: 615, y: 1020 },
    { id: "SP-49", x: 675, y: 1020 },
    { id: "SP-50", x: 875, y: 1020 },
  ].map((b) => ({
    id: b.id,
    name: b.id.replace("SP-", "P"),
    x: b.x,
    y: b.y,
    width: 54,
    height: 44,
    zone: "Zone D (Lower Island)",
    orientation: "horizontal" as const,
    coveringCamera: "CAM-09",
  })),

  // Zone E: South Perimeter (6 spaces, SP-51 to SP-56)
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `SP-${String(51 + i).padStart(2, "0")}`,
    name: `P${String(51 + i).padStart(2, "0")}`,
    x: Math.round(580 + i * 55),
    y: 1210,
    width: 46,
    height: 68,
    zone: "Zone E (South Perimeter)",
    orientation: "vertical" as const,
    coveringCamera: "CAM-06",
  })),

  // Zone F: West Wing (4 spaces, SP-57 to SP-60)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `SP-${String(57 + i).padStart(2, "0")}`,
    name: `P${String(57 + i).padStart(2, "0")}`,
    x: 250,
    y: Math.round(600 + i * 90),
    width: 68,
    height: 44,
    zone: "Zone F (West Wing)",
    orientation: "horizontal" as const,
    coveringCamera: "CAM-08",
  })),
];

// ─── 4. CLEAN VECTOR SVG FACILITY ARCHITECTURE GEOMETRY ───────────────────────
// Defined in canonical 1472 × 1508 canvas space
export const FACILITY_SVG_GEOMETRY = {
  viewBox: "0 0 1472 1508",
  width: 1472,
  height: 1508,

  // L-Shaped Exterior Outer Wall Polygon
  outerBoundary: `M 140 50
    L 1150 50
    L 1150 180
    L 1220 180
    L 1220 1280
    L 420 1280
    L 420 1490
    L 140 1490
    Z`,

  // Inner Road Aisle Corridors (Clean Brown Driveway Polygons)
  driveAisles: [
    // Main Entry Throat (Top Right)
    { id: "entry_throat", d: "M 1060 50 L 1150 50 L 1150 190 L 1060 190 Z" },
    // East Main Vertical Trunk (CAM-02 Corridor)
    { id: "east_trunk", d: "M 1060 180 L 1210 180 L 1210 1270 L 1060 1270 Z" },
    // North Horizontal Drive Aisle (Accessing Zone A)
    { id: "north_aisle", d: "M 150 150 L 1060 150 L 1060 210 L 150 210 Z" },
    // Central Cross Aisle (Above Ramp)
    { id: "central_aisle_top", d: "M 480 470 L 1060 470 L 1060 530 L 480 530 Z" },
    // Lower Cross Aisle (CAM-05 & CAM-06 Corridor)
    { id: "lower_aisle", d: "M 380 1070 L 1060 1070 L 1060 1140 L 380 1140 Z" },
    // South Perimeter Lane
    { id: "south_lane", d: "M 420 1240 L 1210 1240 L 1210 1280 L 420 1280 Z" },
    // West Vertical Trunk (Between Stairs and Island)
    { id: "west_trunk", d: "M 460 200 L 550 200 L 550 1140 L 460 1140 Z" },
    // Far Southwest Extension Corridor (CAM-13 Wing)
    { id: "southwest_extension", d: "M 150 1140 L 420 1140 L 420 1480 L 150 1480 Z" },
  ],

  // Structural & Forbidden Core Blocks (Lift cores, stairs, services)
  structuralCores: [
    // Upper Lift & Stair Core (CAM-14 area)
    { id: "lift_stair_upper", x: 180, y: 260, w: 220, h: 180, name: "Stair & Lift Core 01" },
    // Services Room (CAM-11 area)
    { id: "services_room", x: 180, y: 450, w: 220, h: 130, name: "Electrical & Services Room" },
    // Middle Lift & Stair Core (CAM-08 area)
    { id: "lift_stair_mid", x: 180, y: 690, w: 220, h: 180, name: "Stair & Lift Core 02" },
    // Ramp Core (Between Zone B and Zone C)
    { id: "central_ramp_core", x: 550, y: 540, w: 510, h: 130, name: "Vehicle Ramp (Level Transition)" },
    // Lower Ramp Void
    { id: "lower_ramp_void", x: 550, y: 730, w: 510, h: 130, name: "Access Ramp Void" },
    // Tech Park Foundation Pillar Group
    { id: "pillar_core_se", x: 550, y: 1320, w: 550, h: 150, name: "Structural Foundation Void" },
  ],
};

// ─── 5. 30 DETERMINISTIC DEMO VEHICLES (Type A Tracked vs Type B Static) ───────
export const DEMO_30_VEHICLES: DemoVehicleConfig[] = [
  // ─── TYPE A: 10 Tracked / Dynamic Movie Vehicles ───────────────────────────
  // VEH-001: Early Entry to Zone A (SP-02) -> Stays -> Exits near end
  {
    id: "VEH-001",
    plate: "DEMO-001",
    isTypeA: true,
    assignedSlot: "SP-02",
    color: "#3b82f6", // Blue
    model: "Electric Sedan",
    entryTime: 4,
    parkTime: 16,
    exitStartTime: 95,
    exitCompleteTime: 110,
    entryRoute: [
      [1105, 55],   // ACCESS_POINT_B2 (CAM-01)
      [1105, 175],  // North Junction
      [700, 175],   // Along North Aisle
      [306, 175],   // Turn toward SP-02
      [306, 144],   // Bay entrance
    ],
    exitRoute: [
      [306, 144],   // Leave SP-02
      [306, 175],   // North Aisle
      [1040, 175],  // Toward Exit
      [1022, 191],  // Pass CAM-16
      [1105, 55],   // Reach ACCESS_POINT_B2 -> Disappear
    ],
  },

  // VEH-002: Entry to Zone B (SP-14) -> Stays
  {
    id: "VEH-002",
    plate: "DEMO-002",
    isTypeA: true,
    assignedSlot: "SP-14",
    color: "#10b981", // Emerald
    model: "Compact Hybrid",
    entryTime: 12,
    parkTime: 26,
    exitStartTime: 120,
    exitCompleteTime: 136,
    entryRoute: [
      [1105, 55],   // ACCESS_POINT_B2
      [1105, 230],  // Turn to Upper Island
      [750, 230],   // Approach SP-14
      [642, 230],   // In bay
    ],
    exitRoute: [
      [642, 230],
      [1060, 230],
      [1022, 191],
      [1105, 55],
    ],
  },

  // VEH-003: Entry to Zone C (SP-33)
  {
    id: "VEH-003",
    plate: "DEMO-003",
    isTypeA: true,
    assignedSlot: "SP-33",
    color: "#f59e0b", // Amber
    model: "Executive SUV",
    entryTime: 22,
    parkTime: 40,
    exitStartTime: 135,
    exitCompleteTime: 154,
    entryRoute: [
      [1105, 55],
      [1130, 250],
      [1130, 500],  // Down East Trunk past CAM-02
      [800, 500],   // Along Ramp Aisle past CAM-10
      [730, 464],   // Park in SP-33
    ],
    exitRoute: [
      [730, 464],
      [1130, 500],
      [1130, 190],
      [1022, 191],
      [1105, 55],
    ],
  },

  // VEH-004: Entry to Zone D (SP-44)
  {
    id: "VEH-004",
    plate: "DEMO-004",
    isTypeA: true,
    assignedSlot: "SP-44",
    color: "#8b5cf6", // Purple
    model: "City Hatchback",
    entryTime: 32,
    parkTime: 52,
    exitStartTime: 150,
    exitCompleteTime: 172,
    entryRoute: [
      [1105, 55],
      [1130, 600],  // Down East Trunk past CAM-02
      [1130, 900],  // Approach Zone D
      [962, 900],   // Turn into SP-44
    ],
    exitRoute: [
      [962, 900],
      [1130, 900],
      [1130, 200],
      [1022, 191],
      [1105, 55],
    ],
  },

  // VEH-005: Entry to Zone E (SP-52)
  {
    id: "VEH-005",
    plate: "DEMO-005",
    isTypeA: true,
    assignedSlot: "SP-52",
    color: "#ec4899", // Pink
    model: "Crossover EV",
    entryTime: 42,
    parkTime: 65,
    exitStartTime: 165,
    exitCompleteTime: 185,
    entryRoute: [
      [1105, 55],
      [1130, 800],
      [1130, 1100], // Down East Trunk
      [800, 1100],  // Lower Aisle past CAM-05
      [635, 1176],  // Turn into SP-52
    ],
    exitRoute: [
      [635, 1176],
      [800, 1100],
      [1130, 1100],
      [1130, 190],
      [1022, 191],
      [1105, 55],
    ],
  },

  // VEH-006: Entry to Zone A (SP-05)
  {
    id: "VEH-006",
    plate: "DEMO-006",
    isTypeA: true,
    assignedSlot: "SP-05",
    color: "#06b6d4", // Cyan
    model: "Station Wagon",
    entryTime: 50,
    parkTime: 66,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1105, 175],
      [491, 175],
      [491, 144],
    ],
    exitRoute: [],
  },

  // VEH-007: Entry to Zone B (SP-16)
  {
    id: "VEH-007",
    plate: "DEMO-007",
    isTypeA: true,
    assignedSlot: "SP-16",
    color: "#eab308", // Yellow
    model: "Compact Sedan",
    entryTime: 60,
    parkTime: 75,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1105, 230],
      [902, 230],
    ],
    exitRoute: [],
  },

  // VEH-008: Entry to Zone C (SP-37)
  {
    id: "VEH-008",
    plate: "DEMO-008",
    isTypeA: true,
    assignedSlot: "SP-37",
    color: "#14b8a6", // Teal
    model: "Luxury Sedan",
    entryTime: 70,
    parkTime: 90,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1130, 500],
      [930, 500],
      [930, 464],
    ],
    exitRoute: [],
  },

  // VEH-009: Entry to Zone D (SP-47)
  {
    id: "VEH-009",
    plate: "DEMO-009",
    isTypeA: true,
    assignedSlot: "SP-47",
    color: "#6366f1", // Indigo
    model: "SUV 4x4",
    entryTime: 80,
    parkTime: 104,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1130, 960],
      [902, 960],
    ],
    exitRoute: [],
  },

  // VEH-010: Entry to Zone F (SP-58)
  {
    id: "VEH-010",
    plate: "DEMO-010",
    isTypeA: true,
    assignedSlot: "SP-58",
    color: "#f43f5e", // Rose
    model: "Fleet Van",
    entryTime: 88,
    parkTime: 118,
    exitStartTime: 999, // Stays parked
    exitCompleteTime: 999,
    entryRoute: [
      [1105, 55],
      [1105, 175],
      [510, 175],   // Past Lift Core
      [510, 690],   // Down West Trunk
      [284, 690],   // Park in SP-58
    ],
    exitRoute: [],
  },

  // ─── TYPE B: 20 Static Background Parked Vehicles ─────────────────────────
  // Parked at t=0, no fake driving route or timestamps
  ...[
    { id: "VEH-011", slot: "SP-01", color: "#64748b", model: "Sedan" },
    { id: "VEH-012", slot: "SP-03", color: "#475569", model: "Hatchback" },
    { id: "VEH-013", slot: "SP-07", color: "#334155", model: "Crossover" },
    { id: "VEH-014", slot: "SP-09", color: "#64748b", model: "EV" },
    { id: "VEH-015", slot: "SP-11", color: "#475569", model: "SUV" },
    { id: "VEH-016", slot: "SP-15", color: "#334155", model: "Sedan" },
    { id: "VEH-017", slot: "SP-18", color: "#64748b", model: "Compact" },
    { id: "VEH-018", slot: "SP-20", color: "#475569", model: "Hybrid" },
    { id: "VEH-019", slot: "SP-22", color: "#334155", model: "Sedan" },
    { id: "VEH-020", slot: "SP-25", color: "#64748b", model: "Wagon" },
    { id: "VEH-021", slot: "SP-31", color: "#475569", model: "EV" },
    { id: "VEH-022", slot: "SP-35", color: "#334155", model: "SUV" },
    { id: "VEH-023", slot: "SP-39", color: "#64748b", model: "Crossover" },
    { id: "VEH-024", slot: "SP-42", color: "#475569", model: "Compact" },
    { id: "VEH-025", slot: "SP-45", color: "#334155", model: "Sedan" },
    { id: "VEH-026", slot: "SP-49", color: "#64748b", model: "Hatchback" },
    { id: "VEH-027", slot: "SP-53", color: "#475569", model: "SUV" },
    { id: "VEH-028", slot: "SP-55", color: "#334155", model: "Sedan" },
    { id: "VEH-029", slot: "SP-57", color: "#64748b", model: "Van" },
    { id: "VEH-030", slot: "SP-60", color: "#475569", model: "Pickup" },
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
