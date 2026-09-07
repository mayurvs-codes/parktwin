import {
  FACILITY_BOUNDARY,
  TECH_PARK_CORE,
  VEHICLE_FORBIDDEN_REGIONS,
  DRIVE_AISLES,
  PHYSICAL_PARKING_SPACES,
  PARKING_ZONES,
  CANONICAL_CAMERAS,
  NAV_NODES,
  CANONICAL_COORDS,
  RUNTIME_TO_PHYSICAL_MAP,
} from "./twinConfig";

// Re-export for consumers
export {
  PHYSICAL_PARKING_SPACES,
  CANONICAL_CAMERAS,
  PARKING_ZONES,
  VEHICLE_FORBIDDEN_REGIONS,
  DRIVE_AISLES,
  ACCESS_POINT_B2,
  NAV_NODES,
  STATUS_COLORS as STATUS_PALETTE,
} from "./twinConfig";

// Local export for NAV_GRAPH_NODES compatibility
export const NAV_GRAPH_NODES = NAV_NODES;
export { FACILITY_NAV_NODES } from "./twinConfig";

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────────

function getCameraForZone(zone: string): string {
  switch (zone) {
    case "Zone A":
      return "CAM-02";
    case "Zone B":
    case "Zone C":
    case "Zone D":
    case "Zone E":
      return "CAM-03";
    default:
      return "CAM-01";
  }
}

// ─── CANONICAL FACILITY DIMENSIONS ────────────────────────────────────────────
export const FACILITY_CANVAS_WIDTH = CANONICAL_COORDS.FACILITY_X_MAX;
export const FACILITY_CANVAS_HEIGHT = CANONICAL_COORDS.FACILITY_Y_MAX;
export const FACILITY_VIEWBOX = `0 0 ${FACILITY_CANVAS_WIDTH} ${FACILITY_CANVAS_HEIGHT}`;

// ─── BOUNDARY PATHS ───────────────────────────────────────────────────────────
export const FACILITY_BOUNDARY_PATH = `M ${FACILITY_BOUNDARY.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;

export const TECH_PARK_OBSTACLE_PATH = `M ${TECH_PARK_CORE.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;

export const VEHICLE_FORBIDDEN_PATHS = VEHICLE_FORBIDDEN_REGIONS.map(r => ({
  id: r.id,
  name: r.name,
  path: `M ${r.polygon.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`,
  reason: r.reason,
}));

// ─── DRIVE AISLES (converted to SVG paths) ────────────────────────────────────
export interface FacilityLane {
  id: string;
  name: string;
  path: string;
  width: number;
  arrowCoords?: Array<{ x: number; y: number; angle: number }>;
}

function pointsToPath(points: [number, number][]): string {
  return `M ${points.map(([x, y]) => `${x} ${y}`).join(" L ")}`;
}

function generateArrowCoords(centerline: [number, number][], spacing = 120): Array<{ x: number; y: number; angle: number }> {
  const arrows: Array<{ x: number; y: number; angle: number }> = [];
  for (let i = 0; i < centerline.length - 1; i++) {
    const p1 = centerline[i] as [number, number];
    const p2 = centerline[i + 1] as [number, number];
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / spacing));
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      arrows.push({ x, y, angle });
    }
  }
  return arrows;
}

export const FACILITY_LANES: FacilityLane[] = DRIVE_AISLES.map(aisle => {
  const path = pointsToPath(aisle.centerline);
  return {
    id: aisle.id,
    name: aisle.name,
    path,
    width: aisle.width,
    arrowCoords: generateArrowCoords(aisle.centerline),
  };
});

// ─── FIXTURES (Speed bumps, barriers, kiosks) ─────────────────────────────────
export interface FacilityFixture {
  id: string;
  type: "speed_bump" | "barrier" | "kiosk";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export const FACILITY_FIXTURES: FacilityFixture[] = [
  // Speed bumps at entry
  { id: "bump_entry_1", type: "speed_bump", x: 680, y: 130, width: 60, height: 8 },
  { id: "bump_entry_2", type: "speed_bump", x: 680, y: 170, width: 60, height: 8 },
  // Boom barriers
  { id: "barrier_entry", type: "barrier", x: 695, y: 110, width: 10, height: 30 },
  { id: "barrier_exit", type: "barrier", x: 792, y: 1560, width: 10, height: 30 },
  // Entry kiosk
  { id: "kiosk_entry", type: "kiosk", x: 660, y: 100, width: 20, height: 15 },
];

// ─── PARKING SLOT GEOMETRY (Physical + Runtime) ───────────────────────────────
// PHYSICAL_PARKING_SPACES and RUNTIME_TO_PHYSICAL_MAP are imported at top

export interface SlotGeometry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: number;
  zone: string;
  block: string;
  confidence: string;
  vehicleAccessible: boolean;
  physicalId: string;
  camera_id: string;
}

function _orientationToDegrees(orient: "horizontal" | "vertical"): number {
  return orient === "vertical" ? 180 : 90;
}

// Build slot geometry from physical spaces + runtime mapping
function buildSlotGeometry(): Record<string, SlotGeometry> {
  const geometry: Record<string, SlotGeometry> = {};

  // Physical spaces (PHYS_001..PHYS_058)
  for (const space of PHYSICAL_PARKING_SPACES) {
    geometry[space.id] = {
      id: space.id,
      x: space.pdfCenter.x - space.width / 2,
      y: space.pdfCenter.y - space.height / 2,
      width: space.width,
      height: space.height,
      orientation: space.orientationDegrees,
      zone: space.zone,
      block: space.block,
      confidence: space.confidence,
      vehicleAccessible: space.vehicleAccessible,
      physicalId: space.id,
      camera_id: getCameraForZone(space.zone),
    };
  }

  // Runtime slots (P01-P10) - map to physical spaces
  for (const [runtimeId, physicalId] of Object.entries(RUNTIME_TO_PHYSICAL_MAP)) {
    const phys = PHYSICAL_PARKING_SPACES.find(p => p.id === physicalId);
    if (phys) {
      geometry[runtimeId] = {
        id: runtimeId,
        x: phys.pdfCenter.x - phys.width / 2,
        y: phys.pdfCenter.y - phys.height / 2,
        width: phys.width,
        height: phys.height,
        orientation: phys.orientationDegrees,
        zone: phys.zone,
        block: phys.block,
        confidence: phys.confidence,
        vehicleAccessible: phys.vehicleAccessible,
        physicalId: phys.id,
        camera_id: getCameraForZone(phys.zone),
      };
    }
  }

  return geometry;
}

export const SLOT_GEOMETRY_MAP = buildSlotGeometry();

export function getSlotGeometry(slotId: string) {
  return SLOT_GEOMETRY_MAP[slotId] || {
    id: slotId,
    x: 0,
    y: 0,
    width: 9,
    height: 9,
    orientation: 180,
    zone: "Unknown",
    block: "unknown",
    confidence: "UNVERIFIED",
    vehicleAccessible: false,
    physicalId: "",
  };
}

// ─── ZONE GEOMETRY ────────────────────────────────────────────────────────────
export interface ZoneGeometry {
  id: string;
  name: string;
  blocks: readonly string[];
  color: string;
  bounds: { x: number; y: number; width: number; height: number } | null;
}

export const ZONE_GEOMETRY: ZoneGeometry[] = PARKING_ZONES.map(z => ({
  id: z.id,
  name: z.name,
  blocks: z.blocks,
  color: z.color,
  bounds: null, // Could compute from spaces
}));

// ─── CANONICAL CAMERAS (16 cameras - LOCKED) ──────────────────────────────────
export interface CameraGeometry {
  id: string;
  name: string;
  defaultRole: "ENTRY" | "EXIT" | "PARKING_LOT" | "PATH_PARKING" | "UNKNOWN";
  zone: string;
  x: number;
  y: number;
  angle: number;
  fov: number;
  coverage_slots: string[];
  url: string;
  status: "CONFIGURED" | "NOT_CONFIGURED";
  verifiedPosition: { x: number; y: number } | null;
}

export const FACILITY_CAMERAS: Record<string, CameraGeometry> = CANONICAL_CAMERAS.reduce((acc, cam) => {
  const camId = cam.id;
  acc[camId] = {
    id: camId,
    name: cam.name ?? camId,
    defaultRole: cam.role as "ENTRY" | "EXIT" | "PARKING_LOT" | "PATH_PARKING" | "UNKNOWN",
    zone: "facility",
    x: cam.verifiedPosition?.x ?? 0,
    y: cam.verifiedPosition?.y ?? 0,
    angle: 0,
    fov: 65,
    coverage_slots: [],
    url: cam.source ?? "",
    status: cam.status,
    verifiedPosition: cam.verifiedPosition,
  };
  return acc;
}, {} as Record<string, CameraGeometry>);

// ─── NAVIGATION GRAPH ──────────────────────────────────────────────────────────
export interface NavGraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: "entry" | "exit" | "junction" | "aisle" | "slot" | "access_point";
  vehicleAccessible: boolean;
}

// ─── LEGACY COMPATIBILITY ─────────────────────────────────────────────────────
export const L_SHAPED_BOUNDARY_PATH = FACILITY_BOUNDARY_PATH;
export const TECH_PARK_OBSTACLE_PATH_LEGACY = TECH_PARK_OBSTACLE_PATH;
export const FACILITY_CAMERAS_LEGACY = {
  "CAM-01": { name: "B2 Entrance Gate", defaultRole: "ENTRY" as const, zone: "entrance", x: 310, y: 750, angle: 35, fov: 65, coverage_slots: [], url: "/videos/cam1_entry_gate.mp4" },
  "CAM-02": { name: "B2 Parking Bays", defaultRole: "PARKING_LOT" as const, zone: "parking", x: 480, y: 860, angle: -35, fov: 75, coverage_slots: ["P01","P02","P03","P04","P05"], url: "/videos/cam2_parking_bay.mp4" },
  "CAM-03": { name: "B2 Exit Ramp", defaultRole: "EXIT" as const, zone: "exit", x: 1100, y: 900, angle: 195, fov: 70, coverage_slots: ["P06","P07","P08","P09","P10"], url: "/videos/cam3_exit_ramp.mp4" },
};

export function getSlotGeometryLegacy(slotId: string) {
  return getSlotGeometry(slotId);
}