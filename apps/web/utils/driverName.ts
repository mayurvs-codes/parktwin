/** Names spoken in the welcome message for the demo drivers. Keep in sync with DRIVER_NAMES in the backend voice service. */
export const DRIVER_NAMES: Record<string, string> = {
  "VEH-001": "User A",
  "VEH-002": "User B",
  "VEH-003": "Guest",
};

export function driverName(vehicleId: string | null | undefined): string {
  return (vehicleId && DRIVER_NAMES[vehicleId]) || "driver";
}

/** The whole assignment announcement: verification, welcome by name, the place. Nothing else. */
export function assignmentVoiceText(vehicleId: string | null | undefined, bayId: string): string {
  return `Verification successful. Welcome ${driverName(vehicleId)}. Your place is ${bayId}.`;
}
