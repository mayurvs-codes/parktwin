import { describe, it, expect, beforeEach } from "vitest";
import { useSharedDemoState, FOCUSED_ZONE_SPACE_IDS } from "@/store/useSharedDemoState";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";

describe("User Portal Scenario-Driven Runtime Integration Tests", () => {
  beforeEach(() => {
    // Clean reset baseline
    useSharedDemoState.getState().resetAll({ syncUserPortal: true });
  });

  describe("Scenario 1 — User A / Designated Space (SP-07)", () => {
    it("recognizes User A, verifies designated SP-07, navigates, parks, and exits cleanly", () => {
      const shared = useSharedDemoState.getState();
      const user = useUserPortalStore.getState();

      // Identity & Designation
      expect(shared.activePersona).toBe("USER_A");
      expect(user.activeVehicleId).toBe("VEH-001");
      expect(shared.spaces["SP-07"]?.status).toBe("DESIGNATED");
      expect(shared.spaces["SP-07"]?.designatedFor).toBe("USER A (VEH-001)");

      // User A never reserves SP-07 — navigates directly
      user.assignSpace("SP-07");
      user.startNavigation();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-07");
      expect(useUserPortalStore.getState().currentRoute?.destinationId).toBe("SP-07");

      // Arrive & Park
      const parked = user.arriveAtSpace();
      expect(parked).toBe(true);
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");
      expect(useUserPortalStore.getState().sessionTimerRunning).toBe(true);
      expect(useSharedDemoState.getState().spaces["SP-07"]?.status).toBe("OCCUPIED");
      expect(useSharedDemoState.getState().spaces["SP-07"]?.vehicleId).toBe("VEH-001");

      // Request Exit
      useUserPortalStore.getState().requestExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_EXIT");
      expect(useUserPortalStore.getState().navigationMode).toBe("SPACE_TO_EXIT");

      // Reach Gateway & Confirm Exit
      useUserPortalStore.getState().reachGateway();
      expect(useUserPortalStore.getState().journeyStep).toBe("AT_GATEWAY");
      useUserPortalStore.getState().confirmExit();
      expect(useUserPortalStore.getState().journeyStep).toBe("SESSION_COMPLETE");

      // SP-07 returns to DESIGNATED (not generic available)
      const finalSP07 = useSharedDemoState.getState().spaces["SP-07"];
      expect(finalSP07?.status).toBe("DESIGNATED");
      expect(finalSP07?.vehicleId).toBeNull();
      expect(finalSP07?.designatedFor).toBe("USER A (VEH-001)");
    });
  });

  describe("Scenario 2 — User B / No Designation & Explicit Reservation (SP-14)", () => {
    it("starts with no designation, sees 4 available spaces, reserves SP-14, parks, and releases SP-14 on exit", () => {
      // Switch to User B
      useSharedDemoState.getState().setActivePersona("USER_B");
      const shared = useSharedDemoState.getState();
      const user = useUserPortalStore.getState();

      // Identity check
      expect(shared.activePersona).toBe("USER_B");
      expect(user.activeVehicleId).toBe("VEH-002");

      // User B has NO initial assigned space and NO reservation
      expect(user.assignedSpaceId).toBeNull();
      const reservedByUserB = Object.values(shared.spaces).find(
        (s) => s.status === "RESERVED" && s.user === "Registered User B"
      );
      expect(reservedByUserB).toBeUndefined();

      // 4 available spaces in focused zone
      const availableInitial = FOCUSED_ZONE_SPACE_IDS.filter(
        (id) => shared.spaces[id]?.status === "AVAILABLE"
      );
      expect(availableInitial).toEqual(["SP-11", "SP-14", "SP-17", "SP-19"]);
      expect(availableInitial.length).toBe(4);

      // User B reserves SP-14
      useSharedDemoState.getState().reserveSpace("SP-14", "USER_B");
      useUserPortalStore.getState().assignSpace("SP-14");

      const sp14AfterRes = useSharedDemoState.getState().spaces["SP-14"];
      expect(sp14AfterRes?.status).toBe("RESERVED");
      expect(sp14AfterRes?.user).toBe("Registered User B");
      // Reservation MUST NOT create a designation
      expect(sp14AfterRes?.designatedFor).toBeNull();

      // Available spaces drops to 3
      const availableAfterRes = FOCUSED_ZONE_SPACE_IDS.filter(
        (id) => useSharedDemoState.getState().spaces[id]?.status === "AVAILABLE"
      );
      expect(availableAfterRes.length).toBe(3);
      expect(availableAfterRes).not.toContain("SP-14");

      // Navigate to SP-14
      useUserPortalStore.getState().startNavigation();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-14");

      // Park
      useUserPortalStore.getState().arriveAtSpace();
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");
      expect(useSharedDemoState.getState().spaces["SP-14"]?.status).toBe("OCCUPIED");
      expect(useSharedDemoState.getState().spaces["SP-14"]?.vehicleId).toBe("VEH-002");

      // Exit & Space Release
      useUserPortalStore.getState().requestExit();
      useUserPortalStore.getState().reachGateway();
      useUserPortalStore.getState().confirmExit();

      expect(useUserPortalStore.getState().journeyStep).toBe("SESSION_COMPLETE");

      // SP-14 is released back to AVAILABLE
      const sp14Final = useSharedDemoState.getState().spaces["SP-14"];
      expect(sp14Final?.status).toBe("AVAILABLE");
      expect(sp14Final?.user).toBeNull();
      expect(sp14Final?.vehicleId).toBeNull();

      // Available spaces returned to 4
      const availableFinal = FOCUSED_ZONE_SPACE_IDS.filter(
        (id) => useSharedDemoState.getState().spaces[id]?.status === "AVAILABLE"
      );
      expect(availableFinal.length).toBe(4);
      expect(availableFinal).toContain("SP-14");
    });
  });

  describe("Scenario 3 — Guest / Unregistered Visitor (SP-17)", () => {
    it("identifies as Guest, selects public available bay SP-17, navigates, parks, and releases on exit", () => {
      useSharedDemoState.getState().setActivePersona("GUEST");
      const shared = useSharedDemoState.getState();
      const user = useUserPortalStore.getState();

      expect(shared.activePersona).toBe("GUEST");
      expect(user.activeVehicleId).toBe("VEH-003");
      expect(user.assignedSpaceId).toBeNull();

      // Clean state, 4 available spaces
      const availableInitial = FOCUSED_ZONE_SPACE_IDS.filter(
        (id) => shared.spaces[id]?.status === "AVAILABLE"
      );
      expect(availableInitial).toContain("SP-17");

      // Guest selects SP-17 and navigates
      useUserPortalStore.getState().assignSpace("SP-17");
      useUserPortalStore.getState().startNavigation();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-17");

      // Park
      useUserPortalStore.getState().arriveAtSpace();
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");
      expect(useSharedDemoState.getState().spaces["SP-17"]?.status).toBe("OCCUPIED");

      // Exit
      useUserPortalStore.getState().requestExit();
      useUserPortalStore.getState().reachGateway();
      useUserPortalStore.getState().confirmExit();

      // SP-17 released back to AVAILABLE
      expect(useSharedDemoState.getState().spaces["SP-17"]?.status).toBe("AVAILABLE");
    });
  });

  describe("Scenario 4 — Parking Violation (VEH-001 in SP-11)", () => {
    it("triggers violation on SP-11 with expected SP-07, and clears correctly", () => {
      useSharedDemoState.getState().setActivePersona("USER_A");
      useSharedDemoState.getState().triggerViolation();

      const shared = useSharedDemoState.getState();
      expect(shared.violation).not.toBeNull();
      expect(shared.violation?.active).toBe(true);
      expect(shared.violation?.designatedSpaceId).toBe("SP-07");
      expect(shared.violation?.actualSpaceId).toBe("SP-11");
      expect(shared.violation?.vehicleId).toBe("VEH-001");

      // SP-11 status is VIOLATION
      expect(shared.spaces["SP-11"]?.status).toBe("VIOLATION");
      expect(shared.spaces["SP-11"]?.isViolation).toBe(true);

      // SP-07 remains DESIGNATED
      expect(shared.spaces["SP-07"]?.status).toBe("DESIGNATED");

      // Clear violation
      useSharedDemoState.getState().clearViolation();
      const sharedCleared = useSharedDemoState.getState();
      expect(sharedCleared.violation).toBeNull();
      expect(sharedCleared.spaces["SP-11"]?.status).toBe("AVAILABLE");
      expect(sharedCleared.spaces["SP-11"]?.isViolation).toBe(false);
    });
  });

  describe("Scenario 5 — Canonical Baseline & Reset Isolation", () => {
    it("resets to authoritative baseline: 15 occupied, 4 available, 1 designated, 0 reserved, 0 violations", () => {
      // Introduce changes: reserve SP-14, trigger violation
      useSharedDemoState.getState().reserveSpace("SP-14", "USER_B");
      useSharedDemoState.getState().triggerViolation();

      // Perform authoritative reset
      useSharedDemoState.getState().resetAll({ syncUserPortal: true });

      const shared = useSharedDemoState.getState();
      const spaces = Object.values(shared.spaces);

      const occCount = spaces.filter((s) => s.status === "OCCUPIED").length;
      const availCount = spaces.filter((s) => s.status === "AVAILABLE").length;
      const desigCount = spaces.filter((s) => s.status === "DESIGNATED").length;
      const resCount = spaces.filter((s) => s.status === "RESERVED").length;
      const violCount = spaces.filter((s) => s.status === "VIOLATION").length;

      expect(occCount).toBe(15);
      expect(availCount).toBe(4);
      expect(desigCount).toBe(1);
      expect(resCount).toBe(0);
      expect(violCount).toBe(0);
      expect(shared.violation).toBeNull();
      expect(shared.activePersona).toBe("USER_A");
    });
  });
});
