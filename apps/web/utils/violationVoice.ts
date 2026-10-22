import facilityGeometry from "@/config/facility_geometry.json";
import { bayLabel } from "@/utils/bayLabel";

interface BayPos {
  id: string;
  canvas: { x: number; y: number; width: number; height: number };
}

const PX_PER_METRE = 20; // floor-plan canvas scale

const BAYS = facilityGeometry.bays as unknown as BayPos[];

function position(id: string): { x: number; z: number } | null {
  const bay = BAYS.find((b) => b.id === id);
  // Map coordinates (canvas), so the spoken distance and side match what the driver sees on the twin.
  return bay
    ? { x: (bay.canvas.x + bay.canvas.width / 2) / PX_PER_METRE, z: (bay.canvas.y + bay.canvas.height / 2) / PX_PER_METRE }
    : null;
}

/**
 * Spoken directions from one bay to another through the aisle between the two bay rows.
 * Facing +x (toward the right of the map), the bay row nearer the top of the map is on the driver's left.
 */
export function directionsToBay(fromId: string, toId: string): string {
  const target = bayLabel(toId);
  const from = position(fromId);
  const to = position(toId);
  if (!from || !to) return `Navigate to bay ${target}.`;

  const metres = Math.max(1, Math.round(Math.abs(to.x - from.x)));
  const goingRight = to.x >= from.x;
  const turn = goingRight ? "right" : "left";
  // Travelling +x: the row nearer the top of the map is on the left; travelling -x it is on the right.
  const northRow = to.z < from.z;
  const side = northRow === goingRight ? "left" : "right";
  return `Back out into the aisle, turn ${turn}, and drive about ${metres} metres. Bay ${target} will be on your ${side}.`;
}

/** One announcement: the wrong-bay warning followed by navigation to the driver's own bay. */
export function wrongBayVoiceText(actualId: string, designatedId: string): string {
  const target = bayLabel(designatedId);
  return (
    `Warning! This is not your designated parking space. Please move to space ${target}. ` +
    directionsToBay(actualId, designatedId)
  );
}
