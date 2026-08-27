import type { TwinSlotStatus } from "@/types/digitalTwin";

// ─── 2D Canvas Geometry ────────────────────────────────────────────────────

/** Total canvas dimensions (px) */
export const TWIN_CANVAS_WIDTH = 740;
export const TWIN_CANVAS_HEIGHT = 380;

/** Slot tile size (px) */
export const SLOT_W = 96;
export const SLOT_H = 62;
/** Gap between adjacent slots */
export const SLOT_GAP = 14;

/** Y positions of the two parking rows */
export const ROW_A_Y = 52;
export const ROW_B_Y = 244;

/** X origin for the first slot in a row */
export const ROW_START_X = 70;

/** Y centre of the driving lane (between rows) */
export const LANE_Y_MID = 160;

/** Entry / exit marker X positions */
export const ENTRY_X = 80;
export const EXIT_X = 600;

// ─── Slot Count ────────────────────────────────────────────────────────────

export const ZONES = ["A", "B"] as const;
/** 5 slots per row  ×  2 rows = 10 total spaces */
export const SLOTS_PER_ROW = 5;

// ─── 2D Position Helper ───────────────────────────────────────────────────

/**
 * Converts a slot_id (e.g. "A01" … "A05", "B01" … "B05" or "P01" … "P10") into pixel
 * (x, y) coordinates on the 2D Konva canvas.
 */
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
    if (rawNum > 5) {
      row = "B";
      num = rawNum - 5;
    } else {
      row = "A";
      num = rawNum;
    }
  } else {
    return { x: 0, y: 0 };
  }

  if (isNaN(num) || num < 1 || num > SLOTS_PER_ROW) return { x: 0, y: 0 };

  const index = num - 1;
  const x = ROW_START_X + index * (SLOT_W + SLOT_GAP);
  const y = row === "A" ? ROW_A_Y : ROW_B_Y;

  return { x, y };
}

// ─── 3D World Positions ────────────────────────────────────────────────────

/**
 * World-space (x, z) coordinates for each slot in the R3F scene.
 * Supports both A/B zone nomenclature (A01..A05, B01..B05) and P nomenclature (P01..P10).
 */
export const SLOT_3D_POSITIONS: Record<string, { x: number; z: number }> = {
  // Row A
  A01: { x: -2.4, z: -1.6 }, P01: { x: -2.4, z: -1.6 },
  A02: { x: -1.2, z: -1.6 }, P02: { x: -1.2, z: -1.6 },
  A03: { x:  0.0, z: -1.6 }, P03: { x:  0.0, z: -1.6 },
  A04: { x:  1.2, z: -1.6 }, P04: { x:  1.2, z: -1.6 },
  A05: { x:  2.4, z: -1.6 }, P05: { x:  2.4, z: -1.6 },

  // Row B
  B01: { x: -2.4, z:  1.6 }, P06: { x: -2.4, z:  1.6 },
  B02: { x: -1.2, z:  1.6 }, P07: { x: -1.2, z:  1.6 },
  B03: { x:  0.0, z:  1.6 }, P08: { x:  0.0, z:  1.6 },
  B04: { x:  1.2, z:  1.6 }, P09: { x:  1.2, z:  1.6 },
  B05: { x:  2.4, z:  1.6 }, P10: { x:  2.4, z:  1.6 },
};

// ─── 3D Status Colours ─────────────────────────────────────────────────────

/** Colour mapping for the three-js slot meshes. */
export const STATUS_3D_COLORS: Record<TwinSlotStatus, string> = {
  free:      "#22c55e",
  occupied:  "#ef4444",
  reserved:  "#f59e0b",
  violation: "#eab308",
  unknown:   "#64748b",
};
