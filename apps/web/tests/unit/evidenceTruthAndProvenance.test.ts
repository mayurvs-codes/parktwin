import { describe, it, expect, beforeEach } from "vitest";
import rawAnprJson from "@/services/evidence/raw_anpr_result.json";
import { anprEvidenceAdapter } from "@/services/evidence/anprEvidenceAdapter";
import { evidenceVehicleMapper, DEFAULT_EVIDENCE_MAPPINGS } from "@/services/evidence/evidenceVehicleMapper";
import { eventNormalizer } from "@/services/evidence/eventNormalizer";
import { evidenceReplayController } from "@/services/evidence/evidenceReplayController";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { DEMO_VEHICLES } from "@/config/demoVehicles";

describe("Evidence Replay Truth and End-to-End Verification", () => {
  beforeEach(() => {
    evidenceVehicleMapper.resetMappings();
    evidenceReplayController.reset();
    useUserPortalStore.getState().resetDemo();
  });

  describe("1. Raw Evidence File Audit and Provenance", () => {
    it("should verify raw ANPR file run_id, frame count, and detection count", () => {
      expect(rawAnprJson.run_id).toBe("fd3b28581430");
      expect(rawAnprJson.frames_processed).toBe(191);
      expect(rawAnprJson.vehicles_detected).toBe(11);
      expect(rawAnprJson.detected_plates).toHaveLength(11);
    });

    it("should prove exact OCR plate readings and confidences from the raw source", () => {
      const plates = rawAnprJson.detected_plates;

      // Track 6: KA04MN8049
      const trk6 = plates.find((p) => p.tracking_id === 6)!;
      expect(trk6.license_plate).toBe("KA04MN8049");
      expect(trk6.plate_confidence).toBe(0.98);
      expect(trk6.ocr_engine).toBe("paddleocr");
      expect(trk6.vehicle_type).toBe("SUV");
      expect(trk6.brand).toBe("Volkswagen");

      // Track 10: KA05BZ2700
      const trk10 = plates.find((p) => p.tracking_id === 10)!;
      expect(trk10.license_plate).toBe("KA05BZ2700");
      expect(trk10.plate_confidence).toBe(0.98);
      expect(trk10.ocr_engine).toBe("paddleocr");

      // Track 9: KA05NB6963
      const trk9 = plates.find((p) => p.tracking_id === 9)!;
      expect(trk9.license_plate).toBe("KA05NB6963");
      expect(trk9.plate_confidence).toBe(0.92);

      // Track 8: KA05RP4700
      const trk8 = plates.find((p) => p.tracking_id === 8)!;
      expect(trk8.license_plate).toBe("KA05RP4700");
      expect(trk8.plate_confidence).toBe(0.95);

      // Track 1: UNREADABLE
      const trk1 = plates.find((p) => p.tracking_id === 1)!;
      expect(trk1.license_plate).toBe("UNREADABLE");
      expect(trk1.plate_confidence).toBe(0.0);
      expect(trk1.ocr_engine).toBe("none");
    });
  });

  describe("2. AnprEvidenceAdapter Truthfulness and Zero Fabrication", () => {
    it("should adapt raw plates with strict null handling for unreadable plates", () => {
      const evidenceList = anprEvidenceAdapter.getGroundedEvidence();
      expect(evidenceList).toHaveLength(11);

      // Unreadable plate in track 1 must have null plateNumber and null plateConfidence
      const evd1 = evidenceList.find((e) => e.trackId === 1)!;
      expect(evd1.plateNumber).toBeNull();
      expect(evd1.plateConfidence).toBeNull();
      expect(evd1.recognitionStatus).toBe("unreadable");

      // Grounded plate in track 6 must retain exact values
      const evd6 = evidenceList.find((e) => e.trackId === 6)!;
      expect(evd6.plateNumber).toBe("KA04MN8049");
      expect(evd6.plateConfidence).toBe(0.98);
      expect(evd6.ocrEngine).toBe("paddleocr");
      expect(evd6.recognitionStatus).toBe("recognized");
    });

    it("should reject any fabrication of missing fields", () => {
      const adapted = anprEvidenceAdapter.adaptDetectedPlate({
        tracking_id: 99,
        license_plate: "UNREADABLE",
        plate_raw: "",
        plate_confidence: 0.0,
        vehicle_type: "Sedan",
        brand: "Unknown",
        color: "Grey",
        ocr_engine: "none",
        frame_id: 15,
        timestamp: "2026-08-31T11:14:00Z",
      });

      expect(adapted.plateNumber).toBeNull();
      expect(adapted.plateConfidence).toBeNull();
      expect(adapted.recognitionStatus).toBe("unreadable");
    });
  });

  describe("3. Application Scenario Mapping vs. ANPR Identification", () => {
    it("should explicitly document that demo vehicle IDs are application scenario mappings", () => {
      for (const m of DEFAULT_EVIDENCE_MAPPINGS) {
        expect(m.demoVehicleId).toMatch(/^VEH-00[1-5]$/);
        expect(m.notes).toContain("Real ANPR:");
      }

      // VEH-005 maps to Track 1 (unreadable in CCTV)
      const mapping5 = evidenceVehicleMapper.getMappingForDemoVehicle("VEH-005")!;
      expect(mapping5.trackId).toBe(1);
      expect(DEMO_VEHICLES["VEH-005"]?.evidence.plate).toBeNull();
      expect(DEMO_VEHICLES["VEH-005"]?.evidence.anprStatus).toBe("UNREADABLE_PENDING_LINK");
    });
  });

  describe("4. Normalized Event Source Tagging Audit", () => {
    it("should strictly assign CCTV_ANPR only to physical camera observations", () => {
      const trk6 = anprEvidenceAdapter.getGroundedEvidence().find((e) => e.trackId === 6)!;

      const entryEvt = eventNormalizer.createEntryDetectedEvent(trk6, "VEH-001");
      expect(entryEvt.source).toBe("CCTV_ANPR");
      expect(entryEvt.metadata.trackId).toBe(6);

      const plateEvt = eventNormalizer.createPlateRecognizedEvent(trk6, "VEH-001");
      expect(plateEvt.source).toBe("CCTV_ANPR");
      expect(plateEvt.metadata.plateNumber).toBe("KA04MN8049");
    });

    it("should strictly assign APP_DECISION to business logic, routing, and exit", () => {
      // Space assignment
      const assignEvt = eventNormalizer.createParkingAssignedEvent("VEH-001", "SP-24", true);
      expect(assignEvt.source).toBe("APP_DECISION");

      // Navigation start
      const navEvt = eventNormalizer.createNavigationStartedEvent("VEH-001", "SP-24");
      expect(navEvt.source).toBe("APP_DECISION");

      // Vehicle parked (driver arrival, not in-bay camera)
      const parkEvt = eventNormalizer.createVehicleParkedEvent("VEH-001", "SP-24");
      expect(parkEvt.source).toBe("APP_DECISION");

      // Exit requested
      const exitReq = eventNormalizer.createExitRequestedEvent("VEH-001", "SP-24");
      expect(exitReq.source).toBe("APP_DECISION");

      // Gateway reached (navigation waypoint completion, not exit CCTV observation)
      const gateEvt = eventNormalizer.createGatewayReachedEvent("VEH-001", "CAM-01");
      expect(gateEvt.source).toBe("APP_DECISION");
      expect(gateEvt.metadata.message).toContain("waypoint");

      // Session completed
      const completeEvt = eventNormalizer.createSessionCompletedEvent("VEH-001", "SP-24", 120);
      expect(completeEvt.source).toBe("APP_DECISION");
    });
  });

  describe("5. Replay Controller Speed, Ordering, and State Control", () => {
    it("should sort timeline strictly by frame_id", () => {
      const timeline = evidenceReplayController.getTimeline();
      expect(timeline.length).toBe(11);

      let prevFrame = -1;
      for (const step of timeline) {
        expect(step.frameId).toBeGreaterThanOrEqual(prevFrame);
        prevFrame = step.frameId;
      }
    });

    it("should support playback speed changes", () => {
      evidenceReplayController.setSpeed(2);
      expect(evidenceReplayController.getSpeed()).toBe(2);

      evidenceReplayController.setSpeed(4);
      expect(evidenceReplayController.getSpeed()).toBe(4);

      evidenceReplayController.setSpeed(1);
      expect(evidenceReplayController.getSpeed()).toBe(1);
    });
  });

  describe("6. Strict Mode Isolation: Evidence Mode vs. Demo Mode", () => {
    it("should ensure stepNextEvent delegates to stepEvidenceReplay in EVIDENCE mode", () => {
      const store = useUserPortalStore.getState();
      store.setExecutionMode("EVIDENCE");
      expect(store.evidenceStepIndex).toBe(-1);

      // Calling stepNextEvent while in EVIDENCE mode should advance evidence replay
      store.stepNextEvent();
      expect(useUserPortalStore.getState().evidenceStepIndex).toBe(0);
      expect(useUserPortalStore.getState().events.length).toBeGreaterThan(0);
    });

    it("should keep DEMO mode independent and deterministic", () => {
      useUserPortalStore.getState().setExecutionMode("DEMO");
      useUserPortalStore.getState().resetDemo();

      const store = useUserPortalStore.getState();
      expect(store.journeyStep).toBe("SPACE_ASSIGNED");
      expect(store.executionMode).toBe("DEMO");

      // Advance through demo journey
      store.stepNextEvent();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");

      // Arrive and mark space occupied in shared store
      store.arriveAtSpace();
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");
      const sp07 = useDemoMovieStore.getState().spaces.find((s) => s.id === "SP-07");
      expect(sp07?.isOccupied).toBe(true);

      // Clean reset
      store.resetDemo();
      expect(useUserPortalStore.getState().journeyStep).toBe("SPACE_ASSIGNED");
      expect(useUserPortalStore.getState().activeSession).toBeNull();
    });
  });
});
