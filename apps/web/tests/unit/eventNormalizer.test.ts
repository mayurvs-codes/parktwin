import { describe, it, expect } from "vitest";
import { eventNormalizer } from "@/services/evidence/eventNormalizer";
import { anprEvidenceAdapter } from "@/services/evidence/anprEvidenceAdapter";

describe("Event Normalizer", () => {
  const groundedEvidence = anprEvidenceAdapter.getGroundedEvidence();
  const trk6 = groundedEvidence.find((e) => e.trackId === 6)!;
  const trk1 = groundedEvidence.find((e) => e.trackId === 1)!;

  it("should create ENTRY_DETECTED with CCTV_ANPR source", () => {
    const evt = eventNormalizer.createEntryDetectedEvent(trk6, "VEH-001");
    expect(evt.eventType).toBe("ENTRY_DETECTED");
    expect(evt.source).toBe("CCTV_ANPR");
    expect(evt.vehicleId).toBe("VEH-001");
    expect(evt.cameraId).toBe("CAM-01");
    expect(evt.metadata.trackId).toBe(6);
    expect(evt.metadata.frameId).toBe(57);
    expect(evt.metadata.vehicleType).toBe("SUV");
  });

  it("should create PLATE_RECOGNIZED for readable plate with OCR metadata", () => {
    const evt = eventNormalizer.createPlateRecognizedEvent(trk6, "VEH-001");
    expect(evt.eventType).toBe("PLATE_RECOGNIZED");
    expect(evt.source).toBe("CCTV_ANPR");
    expect(evt.metadata.plateNumber).toBe("KA04MN8049");
    expect(evt.metadata.plateConfidence).toBe(0.98);
    expect(evt.metadata.ocrEngine).toBe("paddleocr");
  });

  it("should create VEHICLE_IDENTIFIED for unreadable plate with null plateNumber", () => {
    const evt = eventNormalizer.createPlateRecognizedEvent(trk1, "VEH-005");
    expect(evt.eventType).toBe("VEHICLE_IDENTIFIED");
    expect(evt.source).toBe("CCTV_ANPR");
    expect(evt.metadata.plateNumber).toBeNull();
    expect(evt.metadata.plateConfidence).toBeNull();
    expect(evt.metadata.message).toContain("Pending Real ANPR Link");
  });

  it("should separate CCTV facts from APP_DECISION events", () => {
    // PARKING_ASSIGNED is an application decision
    const assignEvt = eventNormalizer.createParkingAssignedEvent("VEH-001", "SP-24", true, "Zone C");
    expect(assignEvt.eventType).toBe("PARKING_ASSIGNED");
    expect(assignEvt.source).toBe("APP_DECISION");
    expect(assignEvt.metadata.spaceId).toBe("SP-24");
    expect(assignEvt.metadata.wasReserved).toBe(true);

    // NAVIGATION_STARTED is an application decision
    const navEvt = eventNormalizer.createNavigationStartedEvent("VEH-001", "SP-24");
    expect(navEvt.source).toBe("APP_DECISION");

    // VEHICLE_PARKED is an application decision
    const parkedEvt = eventNormalizer.createVehicleParkedEvent("VEH-001", "SP-24");
    expect(parkedEvt.source).toBe("APP_DECISION");
    expect(parkedEvt.metadata.spaceId).toBe("SP-24");

    // GATEWAY_REACHED is an application waypoint completion (no exit CCTV in video)
    const gateEvt = eventNormalizer.createGatewayReachedEvent("VEH-001", "CAM-01");
    expect(gateEvt.eventType).toBe("GATEWAY_REACHED");
    expect(gateEvt.source).toBe("APP_DECISION");

    // SESSION_COMPLETED is an application decision
    const completeEvt = eventNormalizer.createSessionCompletedEvent("VEH-001", "SP-24", 120);
    expect(completeEvt.eventType).toBe("SESSION_COMPLETED");
    expect(completeEvt.source).toBe("APP_DECISION");
    expect(completeEvt.metadata.durationSeconds).toBe(120);
  });
});
