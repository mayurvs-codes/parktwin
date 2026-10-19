/**
 * ParkTwin AI — Normalized Parking Event Normalizer
 * ===================================================
 * Bridges CCTV/ANPR physical observations and application decisions into a
 * canonical normalized event stream.
 *
 * Strict Compliance:
 *  - CCTV_ANPR source: Only used for facts physically observed by camera (detection, plate, frame).
 *  - APP_DECISION source: Used for business logic (reservations, assignments, routing, sessions).
 *  - Never attribute application decisions to CCTV evidence.
 */

import type { NormalizedParkingEvent, ParkingEventType } from "@/types/parkingEvents";
import type { VehicleEvidence } from "@/types/evidence";

let eventSequence = 0;

function nextEventId(type: ParkingEventType): string {
  eventSequence += 1;
  return `EVT-${Date.now()}-${String(eventSequence).padStart(4, "0")}-${type}`;
}

export class EventNormalizer {
  /**
   * Generates an ENTRY_DETECTED event from physical CCTV camera detection.
   */
  public createEntryDetectedEvent(
    evidence: VehicleEvidence,
    logicalVehicleId?: string
  ): NormalizedParkingEvent {
    return {
      eventId: nextEventId("ENTRY_DETECTED"),
      eventType: "ENTRY_DETECTED",
      vehicleId: logicalVehicleId ?? `TRK-${evidence.trackId}`,
      timestamp: evidence.timestamp,
      cameraId: evidence.cameraId,
      source: "CCTV_ANPR",
      metadata: {
        trackId: evidence.trackId,
        frameId: evidence.frameId,
        vehicleType: evidence.vehicleType,
        brand: evidence.brand,
        color: evidence.color,
        message: `Physical vehicle entry detected at ${evidence.cameraName}`,
      },
    };
  }

  /**
   * Generates a PLATE_RECOGNIZED or VEHICLE_IDENTIFIED event from OCR / ANPR pipeline.
   */
  public createPlateRecognizedEvent(
    evidence: VehicleEvidence,
    logicalVehicleId?: string
  ): NormalizedParkingEvent {
    const isReadable = Boolean(evidence.plateNumber);

    return {
      eventId: nextEventId(isReadable ? "PLATE_RECOGNIZED" : "VEHICLE_IDENTIFIED"),
      eventType: isReadable ? "PLATE_RECOGNIZED" : "VEHICLE_IDENTIFIED",
      vehicleId: logicalVehicleId ?? `TRK-${evidence.trackId}`,
      timestamp: evidence.timestamp,
      cameraId: evidence.cameraId,
      source: "CCTV_ANPR",
      metadata: {
        trackId: evidence.trackId,
        frameId: evidence.frameId,
        plateNumber: evidence.plateNumber,
        plateConfidence: evidence.plateConfidence,
        ocrEngine: evidence.ocrEngine,
        message: isReadable
          ? `Plate ${evidence.plateNumber} recognized with ${(
              (evidence.plateConfidence ?? 0) * 100
            ).toFixed(0)}% confidence via ${evidence.ocrEngine}`
          : "Plate unreadable; marked Pending Real ANPR Link",
      },
    };
  }

  /**
   * Generates a PARKING_ASSIGNED event (Application Decision).
   */
  public createParkingAssignedEvent(
    vehicleId: string,
    spaceId: string,
    wasReserved: boolean,
    zone = "Zone B",
    cameraId = "CAM-01"
  ): NormalizedParkingEvent {
    return {
      eventId: nextEventId("PARKING_ASSIGNED"),
      eventType: "PARKING_ASSIGNED",
      vehicleId,
      timestamp: new Date().toISOString(),
      cameraId,
      source: "APP_DECISION",
      metadata: {
        spaceId,
        zone,
        wasReserved,
        message: wasReserved
          ? `Assigned reserved parking bay ${spaceId}`
          : `Allocated dynamic free space ${spaceId}`,
      },
    };
  }

  /**
   * Generates a NAVIGATION_STARTED event.
   */
  public createNavigationStartedEvent(
    vehicleId: string,
    spaceId: string,
    cameraId = "CAM-01"
  ): NormalizedParkingEvent {
    return {
      eventId: nextEventId("NAVIGATION_STARTED"),
      eventType: "NAVIGATION_STARTED",
      vehicleId,
      timestamp: new Date().toISOString(),
      cameraId,
      source: "APP_DECISION",
      metadata: {
        spaceId,
        message: `GPS navigation route plotted to bay ${spaceId}`,
      },
    };
  }

  /**
   * Generates a VEHICLE_PARKED event.
   */
  public createVehicleParkedEvent(
    vehicleId: string,
    spaceId: string,
    cameraId = "CAM-01"
  ): NormalizedParkingEvent {
    return {
      eventId: nextEventId("VEHICLE_PARKED"),
      eventType: "VEHICLE_PARKED",
      vehicleId,
      timestamp: new Date().toISOString(),
      cameraId,
      source: "APP_DECISION",
      metadata: {
        spaceId,
        message: `Vehicle parked in bay ${spaceId}; space status transitioned to OCCUPIED`,
      },
    };
  }

  /**
   * Generates an EXIT_REQUESTED event.
   */
  public createExitRequestedEvent(
    vehicleId: string,
    spaceId: string,
    cameraId = "CAM-01"
  ): NormalizedParkingEvent {
    return {
      eventId: nextEventId("EXIT_REQUESTED"),
      eventType: "EXIT_REQUESTED",
      vehicleId,
      timestamp: new Date().toISOString(),
      cameraId,
      source: "APP_DECISION",
      metadata: {
        spaceId,
        message: `Driver requested exit from ${spaceId} toward ACCESS_POINT_B2`,
      },
    };
  }

  /**
   * Generates a GATEWAY_REACHED event.
   */
  public createGatewayReachedEvent(
    vehicleId: string,
    cameraId = "CAM-01"
  ): NormalizedParkingEvent {
    return {
      eventId: nextEventId("GATEWAY_REACHED"),
      eventType: "GATEWAY_REACHED",
      vehicleId,
      timestamp: new Date().toISOString(),
      cameraId,
      source: "APP_DECISION",
      metadata: {
        message: `Vehicle reached exit gateway waypoint ACCESS_POINT_B2 (navigation completed)`,
      },
    };
  }

  /**
   * Generates a SESSION_COMPLETED event.
   */
  public createSessionCompletedEvent(
    vehicleId: string,
    spaceId: string,
    durationSeconds: number,
    cameraId = "CAM-01"
  ): NormalizedParkingEvent {
    return {
      eventId: nextEventId("SESSION_COMPLETED"),
      eventType: "SESSION_COMPLETED",
      vehicleId,
      timestamp: new Date().toISOString(),
      cameraId,
      source: "APP_DECISION",
      metadata: {
        spaceId,
        durationSeconds,
        message: `Session finalized; bay ${spaceId} released from OCCUPIED to AVAILABLE`,
      },
    };
  }
}

/** Global singleton event normalizer instance */
export const eventNormalizer = new EventNormalizer();
