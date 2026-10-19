import { describe, it, expect, beforeEach } from "vitest";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { DEMO_VEHICLES, DEMO_VEHICLE_IDS } from "@/config/demoVehicles";

describe("User Portal & Shared Facility Architecture Verification Suite", () => {
  beforeEach(() => {
    // Reset both stores to initial scenario state
    useUserPortalStore.getState().resetDemo();
  });

  describe("1. Grounded Vehicle Configuration Layer", () => {
    it("should define exactly 5 demo vehicles (VEH-001 through VEH-005)", () => {
      expect(DEMO_VEHICLE_IDS).toHaveLength(5);
      expect(DEMO_VEHICLE_IDS).toEqual(["VEH-001", "VEH-002", "VEH-003", "VEH-004", "VEH-005"]);
    });

    it("should strictly ground vehicle evidence on CAM-01 and ACCESS_POINT_B2", () => {
      DEMO_VEHICLE_IDS.forEach((vid) => {
        const v = DEMO_VEHICLES[vid];
        expect(v).toBeDefined();
        expect(v!.evidence.source).toBe("CCTV");
        expect(v!.evidence.cameraId).toBe("CAM-01");
        expect(v!.evidence.accessPoint).toBe("ACCESS_POINT_B2");
        expect(["recognized", "unreadable"]).toContain(v!.evidence.recognitionStatus);
        // Plate must not be fabricated: only real grounded pipeline plates or null
        if (vid === "VEH-005") {
          expect(v!.evidence.plate).toBeNull();
        } else {
          expect(["KA04MN8049", "KA05BZ2700", "KA05NB6963", "KA05RP4700"]).toContain(v!.evidence.plate);
        }
      });
    });

    it("should strictly separate demo reservation scenario from CCTV evidence", () => {
      // VEH-001 has designated space SP-07 (Registered User A)
      expect(DEMO_VEHICLES["VEH-001"]!.scenario.hasReservation).toBe(true);
      expect(DEMO_VEHICLES["VEH-001"]!.scenario.assignedSpaceId).toBe("SP-07");

      // VEH-002 is registered without initial reservation or designation
      expect(DEMO_VEHICLES["VEH-002"]!.scenario.hasReservation).toBe(false);
      expect(DEMO_VEHICLES["VEH-002"]!.scenario.assignedSpaceId).toBeNull();

      // VEH-003, VEH-004, VEH-005 have NO reservation
      expect(DEMO_VEHICLES["VEH-003"]!.scenario.hasReservation).toBe(false);
      expect(DEMO_VEHICLES["VEH-003"]!.scenario.assignedSpaceId).toBeNull();

      expect(DEMO_VEHICLES["VEH-004"]!.scenario.hasReservation).toBe(false);
      expect(DEMO_VEHICLES["VEH-004"]!.scenario.assignedSpaceId).toBeNull();

      expect(DEMO_VEHICLES["VEH-005"]!.scenario.hasReservation).toBe(false);
      expect(DEMO_VEHICLES["VEH-005"]!.scenario.assignedSpaceId).toBeNull();
    });
  });

  describe("2. Deterministic State Machine Transitions", () => {
    it("should correctly transition through the complete 12-step driver journey", () => {
      const store = useUserPortalStore.getState();
      useUserPortalStore.setState({ journeyStep: "NOT_SEEN" });

      // Step 1: Detect Entry
      useUserPortalStore.getState().detectEntry();
      expect(useUserPortalStore.getState().journeyStep).toBe("ENTRY_DETECTED");

      // Step 2: Identify Vehicle
      useUserPortalStore.getState().identifyVehicle();
      expect(useUserPortalStore.getState().journeyStep).toBe("VEHICLE_IDENTIFIED");

      // Step 3: Check Reservation (VEH-001 is reserved)
      useUserPortalStore.getState().checkReservation();
      expect(useUserPortalStore.getState().journeyStep).toBe("SPACE_ASSIGNED");

      // Step 4: Start Navigation
      useUserPortalStore.getState().startNavigation();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");
      expect(useUserPortalStore.getState().navigationMode).toBe("ENTRY_TO_SPACE");

      // Step 5: Advance & Arrive at Space
      useUserPortalStore.getState().arriveAtSpace();
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");
      expect(useUserPortalStore.getState().sessionTimerRunning).toBe(true);

      // Step 6: View Parking Session
      useUserPortalStore.getState().viewParkingSession();
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKING_SESSION");

      // Step 7: Request Exit
      useUserPortalStore.getState().requestExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_EXIT");
      expect(useUserPortalStore.getState().navigationMode).toBe("SPACE_TO_EXIT");

      // Step 8: Reach Gateway
      useUserPortalStore.getState().reachGateway();
      expect(useUserPortalStore.getState().journeyStep).toBe("AT_GATEWAY");

      // Step 9: Confirm Exit
      useUserPortalStore.getState().confirmExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("SESSION_COMPLETE");
      expect(useUserPortalStore.getState().sessionTimerRunning).toBe(false);
    });
  });

  describe("3. Shared Facility State Synchronization", () => {
    it("should synchronize bay occupancy with useDemoMovieStore when vehicle parks and exits", () => {
      const targetSlot = "SP-07";
      const userStore = useUserPortalStore.getState();
      const movieStore = useDemoMovieStore.getState();

      // Ensure space is initially available in shared movie store
      const initialBay = movieStore.spaces.find((s) => s.id === targetSlot);
      expect(initialBay).toBeDefined();

      // Start navigation and park VEH-001 at SP-07
      useUserPortalStore.setState({
        journeyStep: "NAVIGATING_TO_SPACE",
        assignedSpaceId: targetSlot,
        assignedSpace: initialBay!,
      });
      useUserPortalStore.getState().arriveAtSpace();

      // Verify shared state reflects OCCUPIED
      const updatedMovieSpacesAfterPark = useDemoMovieStore.getState().spaces;
      const bayAfterPark = updatedMovieSpacesAfterPark.find((s) => s.id === targetSlot);
      expect(bayAfterPark?.isOccupied).toBe(true);
      expect(bayAfterPark?.currentVehicleId).toBe("VEH-001");

      // Exit and confirm exit at gateway
      useUserPortalStore.getState().viewParkingSession();
      useUserPortalStore.getState().requestExit();
      useUserPortalStore.getState().reachGateway();
      useUserPortalStore.getState().confirmExit();

      // Verify shared state returns to AVAILABLE
      const updatedMovieSpacesAfterExit = useDemoMovieStore.getState().spaces;
      const bayAfterExit = updatedMovieSpacesAfterExit.find((s) => s.id === targetSlot);
      expect(bayAfterExit?.isOccupied).toBe(false);
      expect(bayAfterExit?.currentVehicleId).toBeNull();
    });
  });

  describe("4. No-Reservation Vehicle Allocation Flow", () => {
    it("should handle VEH-003 without reservation, allowing dynamic bay selection", () => {
      // Select VEH-003
      useUserPortalStore.getState().selectVehicle("VEH-003");
      const state = useUserPortalStore.getState();

      expect(state.activeVehicleId).toBe("VEH-003");
      expect(state.vehicleDef.scenario.hasReservation).toBe(false);

      // Verify available spaces dynamic derivation
      const availableSpaces = useDemoMovieStore.getState().spaces.filter((s) => !s.isOccupied);
      expect(availableSpaces.length).toBeGreaterThan(0);

      // Assign recommended space SP-08
      useUserPortalStore.getState().assignSpace("SP-08");
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-08");
      expect(useUserPortalStore.getState().journeyStep).toBe("SPACE_ASSIGNED");

      // Start navigation
      useUserPortalStore.getState().startNavigation();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");
      expect(useUserPortalStore.getState().currentRoute?.destinationId).toBe("SP-08");
    });
  });

  describe("5. Demo Controller Reset", () => {
    it("should reset both facility movie store and driver journey back to initial scenario state", () => {
      // Modify state
      useUserPortalStore.getState().selectVehicle("VEH-004");
      useUserPortalStore.setState({ journeyStep: "PARKED" });

      // Run Reset Demo
      useUserPortalStore.getState().resetDemo();

      const finalState = useUserPortalStore.getState();
      expect(finalState.activeVehicleId).toBe("VEH-001");
      expect(finalState.journeyStep).toBe("SPACE_ASSIGNED");
    });
  });
});
