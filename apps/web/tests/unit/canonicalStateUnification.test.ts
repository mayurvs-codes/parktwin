import { describe, it, expect, beforeEach } from "vitest";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { buildRouteToSpace } from "@/services/navigationRouter";
import { CANONICAL_60_SPACES } from "@/components/digital-twin/demoScenarioData";
import { crossTabSyncService } from "@/services/sync/crossTabSyncService";

describe("ParkTwin AI — User Portal Phase 1: Canonical State Unification Regression Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    crossTabSyncService.reset();
    useSharedDemoState.getState().resetAll({ syncUserPortal: true });
  });

  it("Test A: Reset -> User A -> assignedSpaceId === 'SP-07'", () => {
    // 1. Reset demo
    useSharedDemoState.getState().resetAll();

    // 2. Select User A persona
    useSharedDemoState.getState().setActivePersona("USER_A");

    // 3. User portal store resolves VEH-001 with assignedSpaceId SP-07
    const portal = useUserPortalStore.getState();
    expect(portal.activeVehicleId).toBe("VEH-001");
    expect(portal.assignedSpaceId).toBe("SP-07");
    expect(portal.assignedSpace?.id).toBe("SP-07");
    expect(portal.journeyStep).toBe("SPACE_ASSIGNED");

    // Must never resolve to legacy SP-24
    expect(portal.assignedSpaceId).not.toBe("SP-24");
  });

  it("Test B: User A navigation destination -> 'SP-07'", () => {
    // Select User A and start navigation
    useSharedDemoState.getState().setActivePersona("USER_A");
    useUserPortalStore.getState().startNavigation();

    const portal = useUserPortalStore.getState();
    expect(portal.journeyStep).toBe("NAVIGATING_TO_SPACE");
    expect(portal.assignedSpaceId).toBe("SP-07");
    expect(portal.currentRoute?.destinationId).toBe("SP-07");
    expect(portal.currentRoute?.destinationLabel).toContain("SP-07");
  });

  it("Test C: Navigation router route ends at SP-07 coordinates", () => {
    const sp07 = CANONICAL_60_SPACES.find((s) => s.id === "SP-07");
    expect(sp07).toBeDefined();

    const route = buildRouteToSpace(sp07!);
    expect(route.destinationId).toBe("SP-07");
    expect(route.points.length).toBeGreaterThan(2);

    const endPoint = route.points[route.points.length - 1];
    expect(endPoint).toEqual([sp07!.x, sp07!.y]);
  });

  it("Test D: User B initial state -> hasReservation === false, assignedSpaceId === null", () => {
    useSharedDemoState.getState().setActivePersona("USER_B");

    const portal = useUserPortalStore.getState();
    expect(portal.activeVehicleId).toBe("VEH-002");
    expect(portal.vehicleDef.scenario.hasReservation).toBe(false);
    expect(portal.assignedSpaceId).toBeNull();
    expect(portal.assignedSpace).toBeNull();
    expect(portal.journeyStep).toBe("ENTRY_DETECTED");

    // Shared state SP-14 must NOT be reserved before User B explicitly reserves it
    const sp14 = useSharedDemoState.getState().spaces["SP-14"];
    expect(sp14).toBeDefined();
    expect(sp14!.status).toBe("AVAILABLE");
    expect(sp14!.reservation).toBeNull();
  });

  it("Test E: User B reserves SP-14 -> assignedSpaceId === 'SP-14', shared state SP-14 status === 'RESERVED', designatedFor === null", () => {
    useSharedDemoState.getState().setActivePersona("USER_B");

    // User B explicitly reserves SP-14
    useSharedDemoState.getState().reserveSpace("SP-14");

    // Shared state verification
    const sharedSpace = useSharedDemoState.getState().spaces["SP-14"];
    expect(sharedSpace).toBeDefined();
    expect(sharedSpace!.status).toBe("RESERVED");
    expect(sharedSpace!.user).toContain("User B");
    expect(sharedSpace!.reservation).toBe("CONFIRMED");
    expect(sharedSpace!.designatedFor).toBeNull(); // Reservation != Designation

    // User portal verification
    const portal = useUserPortalStore.getState();
    expect(portal.activeVehicleId).toBe("VEH-002");
    expect(portal.assignedSpaceId).toBe("SP-14");
    expect(portal.assignedSpace?.id).toBe("SP-14");
    expect(portal.journeyStep).toBe("SPACE_ASSIGNED");
  });

  it("Test F: User B navigation destination -> 'SP-14'", () => {
    useSharedDemoState.getState().setActivePersona("USER_B");
    useSharedDemoState.getState().reserveSpace("SP-14");

    useUserPortalStore.getState().startNavigation();

    const portal = useUserPortalStore.getState();
    expect(portal.journeyStep).toBe("NAVIGATING_TO_SPACE");
    expect(portal.assignedSpaceId).toBe("SP-14");
    expect(portal.currentRoute?.destinationId).toBe("SP-14");
    expect(portal.currentRoute?.destinationLabel).toContain("SP-14");

    const sp14 = CANONICAL_60_SPACES.find((s) => s.id === "SP-14");
    const endPoint = portal.currentRoute?.points[portal.currentRoute.points.length - 1];
    expect(endPoint).toEqual([sp14!.x, sp14!.y]);
  });

  it("Test G: Guest -> hasReservation === false, assignedSpaceId === null, sees available bays", () => {
    useSharedDemoState.getState().setActivePersona("GUEST");

    const portal = useUserPortalStore.getState();
    expect(portal.activeVehicleId).toBe("VEH-003");
    expect(portal.assignedSpaceId).toBeNull();
    expect(portal.vehicleDef.scenario.hasReservation).toBe(false);

    // Guest sees the 4 canonical available bays in Island 1
    const spaces = useSharedDemoState.getState().spaces;
    const availableBays = Object.values(spaces).filter((s) => s.status === "AVAILABLE");
    expect(availableBays.map((s) => s.id).sort()).toEqual(["SP-11", "SP-14", "SP-17", "SP-19"]);
  });

  it("Test H: Reset demo produces identical state whether called from user portal or shared demo state", () => {
    // 1. Mutate state: reserve SP-14 and park
    useSharedDemoState.getState().setActivePersona("USER_B");
    useSharedDemoState.getState().reserveSpace("SP-14");
    useUserPortalStore.getState().startNavigation();
    useUserPortalStore.getState().arriveAtSpace();

    // 2. Reset via User Portal
    useUserPortalStore.getState().resetDemo();

    const portalStateAfterPortalReset = {
      v1Step: useUserPortalStore.getState().journeys["VEH-001"]?.journeyStep,
      v1Space: useUserPortalStore.getState().journeys["VEH-001"]?.assignedSpaceId,
      v2Step: useUserPortalStore.getState().journeys["VEH-002"]?.journeyStep,
      v2Space: useUserPortalStore.getState().journeys["VEH-002"]?.assignedSpaceId,
      sp14Status: useSharedDemoState.getState().spaces["SP-14"]?.status,
    };

    // 3. Mutate again
    useSharedDemoState.getState().reserveSpace("SP-14");

    // 4. Reset via Shared State
    useSharedDemoState.getState().resetAll();

    const portalStateAfterSharedReset = {
      v1Step: useUserPortalStore.getState().journeys["VEH-001"]?.journeyStep,
      v1Space: useUserPortalStore.getState().journeys["VEH-001"]?.assignedSpaceId,
      v2Step: useUserPortalStore.getState().journeys["VEH-002"]?.journeyStep,
      v2Space: useUserPortalStore.getState().journeys["VEH-002"]?.assignedSpaceId,
      sp14Status: useSharedDemoState.getState().spaces["SP-14"]?.status,
    };

    // Invariant: Both resets produce identical canonical state
    expect(portalStateAfterPortalReset).toEqual(portalStateAfterSharedReset);
    expect(portalStateAfterPortalReset.v1Space).toBe("SP-07");
    expect(portalStateAfterPortalReset.v2Space).toBeNull();
    expect(portalStateAfterPortalReset.sp14Status).toBe("AVAILABLE");
  });

  it("Test I: Admin digital twin at /digital-twin baseline counts: 15 Occupied, 4 Available, 1 Designated, 0 Reserved, 0 Violation", () => {
    useSharedDemoState.getState().resetAll();

    const sharedSpaces = Object.values(useSharedDemoState.getState().spaces);
    expect(sharedSpaces).toHaveLength(20);

    const occupied = sharedSpaces.filter((s) => s.status === "OCCUPIED").length;
    const available = sharedSpaces.filter((s) => s.status === "AVAILABLE").length;
    const designated = sharedSpaces.filter((s) => s.status === "DESIGNATED").length;
    const reserved = sharedSpaces.filter((s) => s.status === "RESERVED").length;
    const violation = sharedSpaces.filter((s) => s.status === "VIOLATION").length;

    expect(occupied).toBe(15);
    expect(available).toBe(4);
    expect(designated).toBe(1);
    expect(reserved).toBe(0);
    expect(violation).toBe(0);

    // Designated space is strictly SP-07 for User A
    const sp07 = useSharedDemoState.getState().spaces["SP-07"];
    expect(sp07).toBeDefined();
    expect(sp07!.status).toBe("DESIGNATED");
    expect(sp07!.designatedFor).toContain("USER A");

    // The 4 available bays are SP-11, SP-14, SP-17, SP-19
    const availableIds = sharedSpaces.filter((s) => s.status === "AVAILABLE").map((s) => s.id).sort();
    expect(availableIds).toEqual(["SP-11", "SP-14", "SP-17", "SP-19"]);
  });
});
