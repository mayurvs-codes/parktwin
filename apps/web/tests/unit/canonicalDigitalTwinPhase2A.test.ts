import { describe, it, expect, beforeEach } from "vitest";
import { useSharedDemoState, FOCUSED_ZONE_SPACE_IDS } from "@/store/useSharedDemoState";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import {
  CANONICAL_60_SPACES,
  ACCESS_POINT_B2,
} from "@/components/digital-twin/demoScenarioData";
import { DEMO_VEHICLES } from "@/config/demoVehicles";

describe("PHASE 2A: One Canonical Digital Twin for Admin + User", () => {
  beforeEach(() => {
    // Reset state before each scenario
    useSharedDemoState.getState().resetAll({ syncUserPortal: true });
  });

  describe("Scenario 1: User A (Registered User with Designated Bay)", () => {
    it("A1: SP-07 is the exact physical parking space across Admin and User", () => {
      const canonicalSpace = CANONICAL_60_SPACES.find((s) => s.id === "SP-07");
      expect(canonicalSpace).toBeDefined();
      expect(canonicalSpace?.id).toBe("SP-07");
      expect(canonicalSpace?.x).toBe(970);
      expect(canonicalSpace?.y).toBe(365);
      expect(canonicalSpace?.zone).toContain("Zone B");

      const sharedSpace = useSharedDemoState.getState().spaces["SP-07"]!;
      expect(sharedSpace).toBeDefined();
      expect(sharedSpace.x).toBe(canonicalSpace?.x);
      expect(sharedSpace.y).toBe(canonicalSpace?.y);
      expect(sharedSpace.status).toBe("DESIGNATED");
      expect(sharedSpace.designatedFor).toBe("USER A (VEH-001)");

      const userPortal = useUserPortalStore.getState();
      expect(userPortal.activeVehicleId).toBe("VEH-001");
      expect(userPortal.assignedSpaceId).toBe("SP-07");
      expect(userPortal.assignedSpace?.x).toBe(canonicalSpace?.x);
      expect(userPortal.assignedSpace?.y).toBe(canonicalSpace?.y);
    });

    it("A2: Destination marker and route target exactly SP-07", () => {
      const userPortal = useUserPortalStore.getState();
      const route = userPortal.currentRoute;
      expect(route).toBeDefined();
      expect(route?.destinationId).toBe("SP-07");

      const lastPoint = route?.points[route.points.length - 1];
      expect(lastPoint).toEqual([970, 365]);
    });

    it("A3: The other 19 focused spaces match Admin baseline exactly (15 Occ, 4 Avail, 1 Desig)", () => {
      const spaces = useSharedDemoState.getState().spaces;
      const focusedList = FOCUSED_ZONE_SPACE_IDS.map((id) => spaces[id]!);

      const occupied = focusedList.filter((s) => s?.status === "OCCUPIED");
      const available = focusedList.filter((s) => s?.status === "AVAILABLE");
      const designated = focusedList.filter((s) => s?.status === "DESIGNATED");
      const reserved = focusedList.filter((s) => s?.status === "RESERVED");

      expect(occupied.length).toBe(15);
      expect(available.length).toBe(4);
      expect(designated.length).toBe(1);
      expect(reserved.length).toBe(0);

      // Verify the 4 available spaces are precisely SP-11, SP-14, SP-17, SP-19
      const availableIds = available.map((s) => s.id).sort();
      expect(availableIds).toEqual(["SP-11", "SP-14", "SP-17", "SP-19"]);
    });
  });

  describe("Scenario 2: User B (Reservation Flow)", () => {
    it("B1: User B starts with no reservation; SP-14 is available in both Admin and User", () => {
      // Switch persona to User B
      useSharedDemoState.getState().setActivePersona("USER_B");
      useUserPortalStore.getState().selectVehicle("VEH-002");

      const userBJourney = useUserPortalStore.getState().journeys["VEH-002"];
      expect(userBJourney.assignedSpaceId).toBeNull();
      expect(userBJourney.assignedSpace).toBeNull();
      expect(userBJourney.currentRoute).toBeNull();

      const sharedSP14 = useSharedDemoState.getState().spaces["SP-14"]!;
      expect(sharedSP14.status).toBe("AVAILABLE");
      expect(sharedSP14.designatedFor).toBeNull();
      expect(sharedSP14.user).toBeNull();
    });

    it("B2: Reserving SP-14 reflects RESERVED immediately on Admin and User, with designatedFor = null", () => {
      useSharedDemoState.getState().setActivePersona("USER_B");
      useUserPortalStore.getState().selectVehicle("VEH-002");

      // Reserve SP-14
      useSharedDemoState.getState().reserveSpace("SP-14", "USER_B");
      useUserPortalStore.getState().assignSpace("SP-14");

      // Check Shared Demo State (consumed by Admin & User)
      const sharedSP14 = useSharedDemoState.getState().spaces["SP-14"]!;
      expect(sharedSP14.status).toBe("RESERVED");
      expect(sharedSP14.user).toBe("Registered User B");
      expect(sharedSP14.designatedFor).toBeNull(); // Reservation != designation!

      // Check User Portal Store
      const userPortal = useUserPortalStore.getState();
      expect(userPortal.assignedSpaceId).toBe("SP-14");
      expect(userPortal.assignedSpace?.id).toBe("SP-14");
      expect(userPortal.currentRoute?.destinationId).toBe("SP-14");

      const lastPoint = userPortal.currentRoute?.points[userPortal.currentRoute.points.length - 1];
      expect(lastPoint).toEqual([sharedSP14.x, sharedSP14.y]);
    });
  });

  describe("Scenario 3: Guest Flow", () => {
    it("C1: Guest sees identical facility with 4 available bays and no designated space", () => {
      useSharedDemoState.getState().setActivePersona("GUEST");
      useUserPortalStore.getState().selectVehicle("VEH-003");

      const spaces = useSharedDemoState.getState().spaces;
      const availableBays = FOCUSED_ZONE_SPACE_IDS.map((id) => spaces[id]!).filter(
        (s) => s?.status === "AVAILABLE"
      );
      expect(availableBays.length).toBe(4);
      expect(availableBays.map((s) => s.id).sort()).toEqual(["SP-11", "SP-14", "SP-17", "SP-19"]);

      const userPortal = useUserPortalStore.getState();
      expect(userPortal.assignedSpaceId).toBeNull();
      expect(userPortal.assignedSpace).toBeNull();
      expect(userPortal.currentRoute).toBeNull();
    });
  });

  describe("Scenario 4: Violation Scenario", () => {
    it("D1: When VEH-001 is placed in SP-11, both twins represent VEH-001 at SP-11, SP-07 designated", () => {
      // Trigger violation
      useSharedDemoState.getState().triggerViolation();

      const state = useSharedDemoState.getState();
      expect(state.violation).not.toBeNull();
      expect(state.violation?.active).toBe(true);
      expect(state.violation?.actualSpaceId).toBe("SP-11");
      expect(state.violation?.designatedSpaceId).toBe("SP-07");
      expect(state.violation?.vehicleId).toBe("VEH-001");

      // SP-11 is VIOLATION with color #ef4444
      const sp11 = state.spaces["SP-11"]!;
      expect(sp11.status).toBe("VIOLATION");
      expect(sp11.vehicleId).toBe("VEH-001");
      expect(sp11.color).toBe("#ef4444");

      // SP-07 remains DESIGNATED for User A
      const sp07 = state.spaces["SP-07"]!;
      expect(sp07.status).toBe("DESIGNATED");
      expect(sp07.designatedFor).toBe("USER A (VEH-001)");

      // User Portal designated space remains SP-07
      const userPortal = useUserPortalStore.getState();
      expect(userPortal.assignedSpaceId).toBe("SP-07");
    });

    it("D2: Clearing violation or reset restores SP-11 to AVAILABLE and SP-07 to DESIGNATED", () => {
      useSharedDemoState.getState().triggerViolation();
      expect(useSharedDemoState.getState().spaces["SP-11"]!.status).toBe("VIOLATION");

      useSharedDemoState.getState().clearViolation();
      expect(useSharedDemoState.getState().spaces["SP-11"]!.status).toBe("AVAILABLE");
      expect(useSharedDemoState.getState().spaces["SP-07"]!.status).toBe("DESIGNATED");
      expect(useSharedDemoState.getState().violation).toBeNull();
    });
  });

  describe("Scenario 5: Geometry and Facility Single Source of Truth", () => {
    it("E1: Access point, dimensions, and coordinates are identical", () => {
      expect(ACCESS_POINT_B2.x).toBe(1105);
      expect(ACCESS_POINT_B2.y).toBe(55);

      // Verify all 20 focused spaces have valid canonical coordinates in 1472 x 1508 space
      for (const id of FOCUSED_ZONE_SPACE_IDS) {
        const space = CANONICAL_60_SPACES.find((s) => s.id === id);
        expect(space).toBeDefined();
        expect(space!.x).toBeGreaterThan(0);
        expect(space!.x).toBeLessThan(1472);
        expect(space!.y).toBeGreaterThan(0);
        expect(space!.y).toBeLessThan(1508);
      }
    });
  });
});
