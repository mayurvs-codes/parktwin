import { describe, it, expect, beforeEach } from "vitest";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { getRoute, buildRouteToSpace, buildRouteToExit } from "@/services/navigationRouter";
import { CANONICAL_60_SPACES, ACCESS_POINT_B2 } from "@/components/digital-twin/demoScenarioData";
import { DEMO_VEHICLE_IDS } from "@/config/demoVehicles";

describe("ParkTwin Deep Integration Audit & Hardening Test Suite", () => {
  beforeEach(() => {
    // Completely reset demo and journey stores before every test
    useUserPortalStore.getState().resetDemo();
  });

  describe("1. Authoritative Digital Twin Geometry & Single Source of Truth", () => {
    it("should use the exact 1472x1508 canvas coordinate space and CANONICAL_60_SPACES", () => {
      const spaces = useDemoMovieStore.getState().spaces;
      expect(spaces).toHaveLength(60);
      expect(CANONICAL_60_SPACES).toHaveLength(60);

      // Verify ACCESS_POINT_B2 gateway
      expect(ACCESS_POINT_B2.x).toBe(1105);
      expect(ACCESS_POINT_B2.y).toBe(55);
    });

    it("should synchronize bay occupancy directly into useDemoMovieStore when parking and exiting", () => {
      const userStore = useUserPortalStore.getState();
      const targetSlot = "SP-07";

      // 1. Advance VEH-001 to parking
      userStore.startNavigation();
      userStore.arriveAtSpace();

      // Verify User Store state
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");
      expect(useUserPortalStore.getState().activeSession).not.toBeNull();

      // Verify Shared Admin / Digital Twin Store state immediately updated
      const movieSpacesAfterPark = useDemoMovieStore.getState().spaces;
      const bayAfterPark = movieSpacesAfterPark.find((s) => s.id === targetSlot);
      expect(bayAfterPark?.isOccupied).toBe(true);
      expect(bayAfterPark?.currentVehicleId).toBe("VEH-001");

      // 2. Drive to exit and confirm at gateway
      useUserPortalStore.getState().viewParkingSession();
      useUserPortalStore.getState().requestExit();
      useUserPortalStore.getState().reachGateway();
      expect(useUserPortalStore.getState().journeyStep).toBe("AT_GATEWAY");

      useUserPortalStore.getState().confirmExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("SESSION_COMPLETE");

      // Verify Shared Admin state returns to AVAILABLE immediately
      const movieSpacesAfterExit = useDemoMovieStore.getState().spaces;
      const bayAfterExit = movieSpacesAfterExit.find((s) => s.id === targetSlot);
      expect(bayAfterExit?.isOccupied).toBe(false);
      expect(bayAfterExit?.currentVehicleId).toBeNull();
    });
  });

  describe("2. Per-Vehicle Isolated Journey State", () => {
    it("should maintain independent journey states when switching between vehicles", () => {
      // 1. Park VEH-001 at SP-07
      useUserPortalStore.getState().selectVehicle("VEH-001");
      useUserPortalStore.getState().startNavigation();
      useUserPortalStore.getState().arriveAtSpace();
      useUserPortalStore.getState().tickDuration(45);

      expect(useUserPortalStore.getState().activeVehicleId).toBe("VEH-001");
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-07");
      expect(useUserPortalStore.getState().sessionDurationSeconds).toBe(45);

      // 2. Switch to VEH-003 (No reservation, at entry)
      useUserPortalStore.getState().selectVehicle("VEH-003");
      expect(useUserPortalStore.getState().activeVehicleId).toBe("VEH-003");
      expect(useUserPortalStore.getState().journeyStep).toBe("ENTRY_DETECTED");
      expect(useUserPortalStore.getState().assignedSpaceId).toBeNull();
      expect(useUserPortalStore.getState().sessionDurationSeconds).toBe(0);

      // Move VEH-003 to SPACE_ASSIGNED with SP-08
      useUserPortalStore.getState().assignSpace("SP-08");
      expect(useUserPortalStore.getState().journeyStep).toBe("SPACE_ASSIGNED");
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-08");

      // 3. Switch back to VEH-001 — Must still be PARKED with active session intact!
      useUserPortalStore.getState().selectVehicle("VEH-001");
      expect(useUserPortalStore.getState().activeVehicleId).toBe("VEH-001");
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-07");
      expect(useUserPortalStore.getState().sessionDurationSeconds).toBe(45);
      expect(useUserPortalStore.getState().activeSession?.spaceId).toBe("SP-07");

      // 4. Switch back to VEH-003 — Must preserve SPACE_ASSIGNED with SP-08!
      useUserPortalStore.getState().selectVehicle("VEH-003");
      expect(useUserPortalStore.getState().activeVehicleId).toBe("VEH-003");
      expect(useUserPortalStore.getState().journeyStep).toBe("SPACE_ASSIGNED");
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-08");
    });
  });

  describe("3. Transition Guard Enforcement", () => {
    it("should reject invalid journey transitions", () => {
      // Force step to NOT_SEEN
      useUserPortalStore.setState({ journeyStep: "NOT_SEEN" });

      // Cannot jump directly to PARKED or NAVIGATING_TO_EXIT
      useUserPortalStore.getState().arriveAtSpace();
      expect(useUserPortalStore.getState().journeyStep).toBe("NOT_SEEN");

      useUserPortalStore.getState().requestExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("NOT_SEEN");

      useUserPortalStore.getState().confirmExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("NOT_SEEN");

      // Can only transition to ENTRY_DETECTED
      useUserPortalStore.getState().detectEntry();
      expect(useUserPortalStore.getState().journeyStep).toBe("ENTRY_DETECTED");

      // Cannot jump from ENTRY_DETECTED to confirmExit
      useUserPortalStore.getState().confirmExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("ENTRY_DETECTED");
    });

    it("should only allow startNavigation from SPACE_ASSIGNED or RESERVATION_CHECK", () => {
      useUserPortalStore.setState({ journeyStep: "ENTRY_DETECTED" });
      useUserPortalStore.getState().startNavigation();
      expect(useUserPortalStore.getState().journeyStep).toBe("ENTRY_DETECTED");

      useUserPortalStore.setState({ journeyStep: "SPACE_ASSIGNED" });
      useUserPortalStore.getState().startNavigation();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");
    });
  });

  describe("4. Route Router Service & DEMO_CONFIGURED_AISLE_ROUTE", () => {
    it("should generate aisle routes tagged with DEMO_CONFIGURED_AISLE_ROUTE", () => {
      const space = CANONICAL_60_SPACES.find((s) => s.id === "SP-24")!;
      const routeToSpace = buildRouteToSpace(space);

      expect(routeToSpace.type).toBe("DEMO_CONFIGURED_AISLE_ROUTE");
      expect(routeToSpace.sourceId).toBe("ACCESS_POINT_B2");
      expect(routeToSpace.destinationId).toBe("SP-24");
      expect(routeToSpace.points[0]).toEqual([ACCESS_POINT_B2.x, ACCESS_POINT_B2.y]);
      expect(routeToSpace.totalDistanceMeters).toBeGreaterThan(10);

      const routeToExit = buildRouteToExit(space);
      expect(routeToExit.type).toBe("DEMO_CONFIGURED_AISLE_ROUTE");
      expect(routeToExit.sourceId).toBe("SP-24");
      expect(routeToExit.destinationId).toBe("ACCESS_POINT_B2");
      expect(routeToExit.points[routeToExit.points.length - 1]).toEqual([ACCESS_POINT_B2.x, ACCESS_POINT_B2.y]);
    });

    it("should step through route waypoints and decrement remaining distance", () => {
      useUserPortalStore.getState().startNavigation();
      const initialRoute = useUserPortalStore.getState().currentRoute!;
      const initialDist = initialRoute.distanceRemainingMeters;

      // Advance one step
      useUserPortalStore.getState().advanceNavigationStep();
      const step1Pos = useUserPortalStore.getState().vehiclePosition;
      const step1Dist = useUserPortalStore.getState().currentRoute!.distanceRemainingMeters;

      expect(step1Pos).toEqual(initialRoute.points[1]);
      expect(step1Dist).toBeLessThan(initialDist);
    });
  });

  describe("5. Dynamic Session Calculation Without Residual Hardcoded Values", () => {
    it("should initialize completedSessions as an empty array", () => {
      expect(useUserPortalStore.getState().completedSessions).toEqual([]);
    });

    it("should dynamically record actual elapsed session duration on exit without 4712 fallback", () => {
      // Park VEH-001
      useUserPortalStore.getState().startNavigation();
      useUserPortalStore.getState().arriveAtSpace();

      // Simulate 120 seconds of live parking
      useUserPortalStore.getState().tickDuration(120);
      expect(useUserPortalStore.getState().sessionDurationSeconds).toBe(120);

      // Exit
      useUserPortalStore.getState().viewParkingSession();
      useUserPortalStore.getState().requestExit();
      useUserPortalStore.getState().reachGateway();
      useUserPortalStore.getState().confirmExit();

      const completed = useUserPortalStore.getState().completedSessions;
      expect(completed).toHaveLength(1);
      expect(completed[0]!.durationSeconds).toBe(120);
      expect(completed[0]!.durationSeconds).not.toBe(4712);
    });
  });

  describe("6. Deterministic Demo Reset from Any Journey Step", () => {
    it("should reset all 5 vehicle journeys and shared facility state", () => {
      // Alter multiple vehicles
      useUserPortalStore.getState().selectVehicle("VEH-002");
      useUserPortalStore.getState().startNavigation();
      useUserPortalStore.getState().arriveAtSpace(); // parked

      useUserPortalStore.getState().selectVehicle("VEH-004");
      useUserPortalStore.getState().assignSpace("SP-30");

      // Reset Demo
      useUserPortalStore.getState().resetDemo();

      // Active vehicle should be VEH-001 ready at initial state
      const state = useUserPortalStore.getState();
      expect(state.activeVehicleId).toBe("VEH-001");
      expect(state.journeyStep).toBe("SPACE_ASSIGNED");
      expect(state.completedSessions).toHaveLength(0);

      // Verify other vehicles are also restored to pristine initial states
      DEMO_VEHICLE_IDS.forEach((id) => {
        const journey = state.journeys[id];
        expect(journey).toBeDefined();
        expect(journey.activeSession).toBeNull();
        expect(journey.sessionDurationSeconds).toBe(0);
      });
    });
  });
});
