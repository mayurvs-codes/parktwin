import { describe, it, expect, beforeEach } from "vitest";
import { useSharedDemoState, FOCUSED_ZONE_SPACE_IDS } from "@/store/useSharedDemoState";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { DEMO_VEHICLES, DEMO_VEHICLE_IDS } from "@/config/demoVehicles";
import { anprEvidenceAdapter } from "@/services/evidence/anprEvidenceAdapter";
import { evidenceVehicleMapper } from "@/services/evidence/evidenceVehicleMapper";
import { evidenceReplayController } from "@/services/evidence/evidenceReplayController";
import { eventNormalizer } from "@/services/evidence/eventNormalizer";
import { CANONICAL_60_SPACES, ACCESS_POINT_B2 } from "@/components/digital-twin/demoScenarioData";

describe("PHASE 3: Real CCTV -> Vehicle Journey -> Parking Intelligence Integration", () => {
  beforeEach(() => {
    // Reset state to clean baseline before each test
    useSharedDemoState.getState().resetAll({ syncUserPortal: true });
    evidenceReplayController.reset();
  });

  describe("TEST 1: User A (VEH-001) Full Lifecycle Journey", () => {
    it("executes ENTRY -> DESIGNATED -> SP-07 -> PARK -> EXIT maintaining canonical integrity", () => {
      // 1. Initial State: User A is selected with designated bay SP-07
      useSharedDemoState.getState().setActivePersona("USER_A");
      useUserPortalStore.getState().selectVehicle("VEH-001");

      const userPortal = useUserPortalStore.getState();
      expect(userPortal.activeVehicleId).toBe("VEH-001");
      expect(userPortal.assignedSpaceId).toBe("SP-07");
      expect(userPortal.journeyStep).toBe("SPACE_ASSIGNED");

      // Verify Shared Demo State has SP-07 DESIGNATED
      const sp07Initial = useSharedDemoState.getState().spaces["SP-07"]!;
      expect(sp07Initial.status).toBe("DESIGNATED");
      expect(sp07Initial.designatedFor).toBe("USER A (VEH-001)");

      // 2. Navigation to Designated Space
      userPortal.startNavigation();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");
      expect(useUserPortalStore.getState().currentRoute?.destinationId).toBe("SP-07");

      // 3. Vehicle Parks in SP-07
      const parkSuccess = useUserPortalStore.getState().arriveAtSpace();
      expect(parkSuccess).toBe(true);
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");
      expect(useUserPortalStore.getState().activeSession).not.toBeNull();
      expect(useUserPortalStore.getState().activeSession?.spaceId).toBe("SP-07");

      // Verify Shared Demo State reflects OCCUPIED by VEH-001 with benchmark plate
      const sp07Parked = useSharedDemoState.getState().spaces["SP-07"]!;
      expect(sp07Parked.status).toBe("OCCUPIED");
      expect(sp07Parked.vehicleId).toBe("VEH-001");
      expect(sp07Parked.plate).toBe("KA04MN8049");

      // Verify Admin Twin movie store reflects occupancy
      const movieBay = useDemoMovieStore.getState().spaces.find((s) => s.id === "SP-07");
      expect(movieBay?.isOccupied).toBe(true);
      expect(movieBay?.currentVehicleId).toBe("VEH-001");

      // 4. Exit Flow: view session -> request exit -> reach gateway -> confirm exit
      useUserPortalStore.getState().viewParkingSession();
      useUserPortalStore.getState().requestExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_EXIT");

      useUserPortalStore.getState().reachGateway();
      expect(useUserPortalStore.getState().journeyStep).toBe("AT_GATEWAY");

      useUserPortalStore.getState().confirmExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("SESSION_COMPLETE");

      // After exit, SP-07 returns to DESIGNATED for User A
      const sp07AfterExit = useSharedDemoState.getState().spaces["SP-07"]!;
      expect(sp07AfterExit.status).toBe("DESIGNATED");
      expect(sp07AfterExit.vehicleId).toBeNull();
      const movieBayAfterExit = useDemoMovieStore.getState().spaces.find((s) => s.id === "SP-07");
      expect(movieBayAfterExit?.isOccupied).toBe(false);
    });
  });

  describe("TEST 2: User B (VEH-002) Dynamic Reservation and Release Journey", () => {
    it("executes ENTRY -> NO DESIGNATION -> RESERVE SP-14 -> NAVIGATE -> PARK -> EXIT (releases SP-14 to AVAILABLE)", () => {
      // 1. Entry & Persona Selection
      useSharedDemoState.getState().setActivePersona("USER_B");
      useUserPortalStore.getState().selectVehicle("VEH-002");

      const userB = useUserPortalStore.getState();
      expect(userB.activeVehicleId).toBe("VEH-002");
      expect(userB.assignedSpaceId).toBeNull();
      expect(userB.journeyStep).toBe("ENTRY_DETECTED");

      // SP-14 must be initially AVAILABLE
      expect(useSharedDemoState.getState().spaces["SP-14"]!.status).toBe("AVAILABLE");

      // 2. Reserve SP-14
      useSharedDemoState.getState().reserveSpace("SP-14", "USER_B");
      useUserPortalStore.getState().assignSpace("SP-14");

      expect(useSharedDemoState.getState().spaces["SP-14"]!.status).toBe("RESERVED");
      expect(useSharedDemoState.getState().spaces["SP-14"]!.user).toBe("Registered User B");
      expect(useSharedDemoState.getState().spaces["SP-14"]!.designatedFor).toBeNull();
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-14");

      // 3. Navigate & Arrive at SP-14
      useUserPortalStore.getState().startNavigation();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");

      const parkSuccess = useUserPortalStore.getState().arriveAtSpace();
      expect(parkSuccess).toBe(true);
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");

      // Verify Shared Demo State has SP-14 OCCUPIED by VEH-002 (KA05BZ2700)
      const sp14Parked = useSharedDemoState.getState().spaces["SP-14"]!;
      expect(sp14Parked.status).toBe("OCCUPIED");
      expect(sp14Parked.vehicleId).toBe("VEH-002");
      expect(sp14Parked.plate).toBe("KA05BZ2700");

      // 4. Exit and Release SP-14
      useUserPortalStore.getState().viewParkingSession();
      useUserPortalStore.getState().requestExit();
      useUserPortalStore.getState().reachGateway();
      useUserPortalStore.getState().confirmExit();

      expect(useUserPortalStore.getState().journeyStep).toBe("SESSION_COMPLETE");

      // Critical check: SP-14 MUST return to AVAILABLE in Shared Demo State
      const sp14AfterExit = useSharedDemoState.getState().spaces["SP-14"]!;
      expect(sp14AfterExit.status).toBe("AVAILABLE");
      expect(sp14AfterExit.vehicleId).toBeNull();
      expect(sp14AfterExit.user).toBeNull();
      expect(sp14AfterExit.reservation).toBeNull();

      // Digital twin movie store also released
      const movieBay14 = useDemoMovieStore.getState().spaces.find((s) => s.id === "SP-14");
      expect(movieBay14?.isOccupied).toBe(false);
    });
  });

  describe("TEST 3: Guest (VEH-003) Non-Designated Browse Experience", () => {
    it("browses facility as unregistered visitor without hijacking designated or occupied spaces", () => {
      useSharedDemoState.getState().setActivePersona("GUEST");
      useUserPortalStore.getState().selectVehicle("VEH-003");

      const guestState = useUserPortalStore.getState();
      expect(guestState.activeVehicleId).toBe("VEH-003");
      expect(guestState.assignedSpaceId).toBeNull();
      expect(guestState.journeyStep).toBe("ENTRY_DETECTED");

      // Exactly 4 available spaces exist in focused zone
      const spaces = useSharedDemoState.getState().spaces;
      const available = Object.values(spaces).filter((s) => s.status === "AVAILABLE");
      expect(available.length).toBe(4);
      expect(available.map((s) => s.id).sort()).toEqual(["SP-11", "SP-14", "SP-17", "SP-19"]);

      // Designated space SP-07 is NOT among available spaces
      expect(available.find((s) => s.id === "SP-07")).toBeUndefined();
    });
  });

  describe("TEST 4: Parking Violation Detection and Synchronization", () => {
    it("detects VEH-001 in unauthorized bay SP-11, keeping SP-07 designated and synchronizing Admin", () => {
      useSharedDemoState.getState().triggerViolation();

      const shared = useSharedDemoState.getState();
      expect(shared.violation).not.toBeNull();
      expect(shared.violation?.active).toBe(true);
      expect(shared.violation?.vehicleId).toBe("VEH-001");
      expect(shared.violation?.plate).toBe("KA04MN8049");
      expect(shared.violation?.designatedSpaceId).toBe("SP-07");
      expect(shared.violation?.actualSpaceId).toBe("SP-11");

      // Bay SP-11 has VIOLATION status and red coloration
      const sp11 = shared.spaces["SP-11"]!;
      expect(sp11.status).toBe("VIOLATION");
      expect(sp11.isViolation).toBe(true);
      expect(sp11.color).toBe("#ef4444");

      // Bay SP-07 remains DESIGNATED for User A
      const sp07 = shared.spaces["SP-07"]!;
      expect(sp07.status).toBe("DESIGNATED");
      expect(sp07.designatedFor).toBe("USER A (VEH-001)");

      // Clearing violation restores SP-11 back to AVAILABLE
      useSharedDemoState.getState().clearViolation();
      expect(useSharedDemoState.getState().violation).toBeNull();
      expect(useSharedDemoState.getState().spaces["SP-11"]!.status).toBe("AVAILABLE");
    });
  });

  describe("TEST 5: Clean Authoritative Baseline Reset", () => {
    it("restores exactly 15 Occupied, 4 Available, 1 Designated on reset", () => {
      // Create chaotic scenario: reserve SP-14, park, trigger violation
      useSharedDemoState.getState().reserveSpace("SP-14", "USER_B");
      useSharedDemoState.getState().occupySpace("SP-14", "VEH-002", "KA05BZ2700");
      useSharedDemoState.getState().triggerViolation();

      // Execute authoritative reset
      useSharedDemoState.getState().resetAll({ syncUserPortal: true });

      const spaces = useSharedDemoState.getState().spaces;
      const list = FOCUSED_ZONE_SPACE_IDS.map((id) => spaces[id]!);

      const occupied = list.filter((s) => s.status === "OCCUPIED");
      const available = list.filter((s) => s.status === "AVAILABLE");
      const designated = list.filter((s) => s.status === "DESIGNATED");
      const violation = list.filter((s) => s.status === "VIOLATION");
      const reserved = list.filter((s) => s.status === "RESERVED");

      expect(occupied.length).toBe(15);
      expect(available.length).toBe(4);
      expect(designated.length).toBe(1);
      expect(violation.length).toBe(0);
      expect(reserved.length).toBe(0);

      expect(designated[0]?.id).toBe("SP-07");
      expect(available.map((s) => s.id).sort()).toEqual(["SP-11", "SP-14", "SP-17", "SP-19"]);
      expect(useSharedDemoState.getState().violation).toBeNull();
    });
  });

  describe("Evidence Truth, ANPR Integrity, and Replay Traceability", () => {
    it("preserves genuine PaddleOCR outputs and handles unreadable plates transparently", () => {
      const allEvidence = anprEvidenceAdapter.getGroundedEvidence();
      expect(allEvidence.length).toBe(11);

      // Verify readable plates
      const veh1Evd = allEvidence.find((e) => e.trackId === 6);
      expect(veh1Evd?.plateNumber).toBe("KA04MN8049");
      expect(veh1Evd?.plateConfidence).toBe(0.98);
      expect(veh1Evd?.ocrEngine).toBe("paddleocr");

      const veh2Evd = allEvidence.find((e) => e.trackId === 10);
      expect(veh2Evd?.plateNumber).toBe("KA05BZ2700");
      expect(veh2Evd?.plateConfidence).toBe(0.98);

      const veh3Evd = allEvidence.find((e) => e.trackId === 9);
      expect(veh3Evd?.plateNumber).toBe("KA05NB6963");
      expect(veh3Evd?.plateConfidence).toBe(0.92);

      // Verify unreadable plate (Track 1 / VEH-005) - NEVER fabricated
      const veh5Evd = allEvidence.find((e) => e.trackId === 1);
      expect(veh5Evd?.plateNumber).toBeNull();
      expect(veh5Evd?.plateConfidence).toBeNull();
      expect(veh5Evd?.recognitionStatus).toBe("unreadable");
    });

    it("verifies event normalizer strictly attributes CCTV facts vs application decisions", () => {
      const evidence = anprEvidenceAdapter.getGroundedEvidence().find((e) => e.trackId === 6)!;

      // CCTV Entry Event
      const entryEvt = eventNormalizer.createEntryDetectedEvent(evidence, "VEH-001");
      expect(entryEvt.source).toBe("CCTV_ANPR");
      expect(entryEvt.cameraId).toBe("CAM-01");
      expect(entryEvt.metadata.trackId).toBe(6);

      // Application Decision Event
      const assignEvt = eventNormalizer.createParkingAssignedEvent("VEH-001", "SP-07", true);
      expect(assignEvt.source).toBe("APP_DECISION");
      expect(assignEvt.metadata.spaceId).toBe("SP-07");
      expect(assignEvt.metadata.wasReserved).toBe(true);
    });

    it("drives deterministic evidence replay timeline chronologically", () => {
      evidenceReplayController.buildTimeline();
      const timeline = evidenceReplayController.getTimeline();
      expect(timeline.length).toBe(11);

      // Frame IDs must be monotonically ordered
      for (let i = 0; i < timeline.length - 1; i++) {
        expect(timeline[i]!.frameId).toBeLessThanOrEqual(timeline[i + 1]!.frameId);
      }

      // Step through first 3 events
      const step0 = evidenceReplayController.stepNext();
      expect(step0).not.toBeNull();
      expect(step0?.stepIndex).toBe(0);
      expect(step0?.evidence.trackId).toBe(1);

      const step1 = evidenceReplayController.stepNext();
      expect(step1?.stepIndex).toBe(1);
      expect(step1?.evidence.trackId).toBe(2);
    });
  });
});
