/**
 * ParkTwin AI — Parking Duration Intelligence & Long-Stay Monitoring Service
 *
 * Implements the core business rule:
 * - Real Parking Duration Threshold: 10 MINUTES (600 seconds)
 * - Warning Threshold: 8 MINUTES (480 seconds)
 * - Crucial condition: The vehicle MUST STILL BE IN THE SAME PARKING SPACE.
 *   If the vehicle moved, exited, or changed spaces, duration is re-evaluated / reset.
 */

export const PARKING_DURATION_THRESHOLD_SECONDS = 600; // 10 minutes real business rule
export const PARKING_DURATION_WARNING_THRESHOLD_SECONDS = 480; // 8 minutes operational warning

export type DurationStatus = "NORMAL" | "WARNING" | "LONG_STAY_ALERT";

export interface DurationEvaluation {
  status: DurationStatus;
  durationSeconds: number;
  thresholdSeconds: number;
  isStillInSameSpace: boolean;
  isExceeded: boolean;
  exceededBySeconds: number;
  formattedDuration: string;
  message: string;
}

export interface MonitoredParkingSession {
  spaceId: string;
  vehicleId: string;
  durationSeconds: number;
  isParked: boolean;
  parkedTimeMs?: number | null;
  exitTime?: string | null;
}

/**
 * Format total seconds into realistic HH:MM:SS format.
 * Examples: 0 -> "00:00:00", 65 -> "00:01:05", 600 -> "00:10:00"
 */
export function formatDurationDisplay(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Verifies whether the vehicle is STILL in the exact same parking space.
 * Prevents false long-stay alerts if the vehicle has exited, changed spaces, or unparked.
 */
export function checkVehicleInSameSpace(
  sessionSpaceId: string | null | undefined,
  currentSpaceId: string | null | undefined,
  spaceOccupantVehicleId: string | null | undefined,
  currentVehicleId: string | null | undefined
): boolean {
  if (!sessionSpaceId || !currentSpaceId || !currentVehicleId) {
    return false;
  }
  // Must match the original assigned/parked space
  if (sessionSpaceId !== currentSpaceId) {
    return false;
  }
  // If the space reports an occupant, it must match the vehicle
  if (spaceOccupantVehicleId && spaceOccupantVehicleId !== currentVehicleId) {
    return false;
  }
  return true;
}

/**
 * Evaluates parking duration for an active session against the 10-minute threshold.
 * Strictly verifies the same-space condition before triggering a LONG_STAY_ALERT.
 */
export function evaluateParkingDuration(
  session: MonitoredParkingSession | null | undefined,
  currentSpaceId: string | null | undefined,
  spaceOccupantVehicleId: string | null | undefined
): DurationEvaluation {
  if (!session || !session.isParked || session.exitTime) {
    return {
      status: "NORMAL",
      durationSeconds: session?.durationSeconds ?? 0,
      thresholdSeconds: PARKING_DURATION_THRESHOLD_SECONDS,
      isStillInSameSpace: false,
      isExceeded: false,
      exceededBySeconds: 0,
      formattedDuration: formatDurationDisplay(session?.durationSeconds ?? 0),
      message: "Vehicle is not actively parked.",
    };
  }

  // Derive duration from parkedTimeMs if available for live accuracy
  const liveDurationSecs =
    session.parkedTimeMs && !session.exitTime
      ? Math.max(0, Math.floor((Date.now() - session.parkedTimeMs) / 1000))
      : session.durationSeconds;

  const isStillInSameSpace = checkVehicleInSameSpace(
    session.spaceId,
    currentSpaceId,
    spaceOccupantVehicleId,
    session.vehicleId
  );

  const formatted = formatDurationDisplay(liveDurationSecs);

  // If vehicle has exceeded 10 minutes
  if (liveDurationSecs >= PARKING_DURATION_THRESHOLD_SECONDS) {
    if (isStillInSameSpace) {
      const exceeded = liveDurationSecs - PARKING_DURATION_THRESHOLD_SECONDS;
      return {
        status: "LONG_STAY_ALERT",
        durationSeconds: liveDurationSecs,
        thresholdSeconds: PARKING_DURATION_THRESHOLD_SECONDS,
        isStillInSameSpace: true,
        isExceeded: true,
        exceededBySeconds: exceeded,
        formattedDuration: formatted,
        message: `LONG-STAY ALERT: Vehicle ${session.vehicleId} has exceeded the 10-minute parking duration limit in space ${session.spaceId}. Continuous bay presence verified.`,
      };
    } else {
      // 10 minutes elapsed, but vehicle moved or left space -> do not alert
      return {
        status: "NORMAL",
        durationSeconds: liveDurationSecs,
        thresholdSeconds: PARKING_DURATION_THRESHOLD_SECONDS,
        isStillInSameSpace: false,
        isExceeded: false,
        exceededBySeconds: 0,
        formattedDuration: formatted,
        message: "Vehicle is no longer in the same parking space. Duration re-evaluated.",
      };
    }
  }

  // If vehicle is approaching threshold (between 8 and 10 minutes)
  if (liveDurationSecs >= PARKING_DURATION_WARNING_THRESHOLD_SECONDS && isStillInSameSpace) {
    return {
      status: "WARNING",
      durationSeconds: liveDurationSecs,
      thresholdSeconds: PARKING_DURATION_THRESHOLD_SECONDS,
      isStillInSameSpace: true,
      isExceeded: false,
      exceededBySeconds: 0,
      formattedDuration: formatted,
      message: `Approaching 10-minute threshold (${formatted}). Long-stay monitoring active.`,
    };
  }

  // Normal duration
  return {
    status: "NORMAL",
    durationSeconds: liveDurationSecs,
    thresholdSeconds: PARKING_DURATION_THRESHOLD_SECONDS,
    isStillInSameSpace,
    isExceeded: false,
    exceededBySeconds: 0,
    formattedDuration: formatted,
    message: `Normal parking duration: ${formatted}.`,
  };
}
