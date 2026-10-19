import { describe, it, expect, beforeEach } from "vitest";
import {
  useSharedDemoState,
  FOCUSED_ZONE_SPACE_IDS,
  INITIAL_AVAILABLE_SPACE_IDS,
} from "../../store/useSharedDemoState";

describe("ParkTwin AI — Focused End-to-End Parking Demo Unit Tests", () => {
  beforeEach(() => {
    // Deterministic reset before every test
    useSharedDemoState.getState().resetAll();
  });

  describe("1. Focused Demo Zone Baseline Invariants (Section 2 & 4)", () => {
    it("should have exactly 20 spaces in the focused demo zone", () => {
      const { spaces } = useSharedDemoState.getState();
      const keys = Object.keys(spaces);
      expect(keys.length).toBe(20);
      expect(keys).toEqual([...FOCUSED_ZONE_SPACE_IDS]);
    });

    it("should have exactly 15 occupied spaces and 5 available/designated spaces in initial state", () => {
      const { spaces } = useSharedDemoState.getState();
      const list = Object.values(spaces);

      const occupied = list.filter((s) => s.status === "OCCUPIED");
      const available = list.filter((s) => s.status === "AVAILABLE");
      const designated = list.filter((s) => s.status === "DESIGNATED");

      expect(occupied.length).toBe(15);
      expect(available.length).toBe(4); // SP-11, SP-14, SP-17, SP-19
      expect(designated.length).toBe(1); // SP-07
      expect(available.length + designated.length).toBe(5);
    });

    it("should ensure strict 1:1 vehicle-to-bay mapping with zero overlap", () => {
      const { spaces } = useSharedDemoState.getState();
      const list = Object.values(spaces);

      list.forEach((bay) => {
        if (bay.status === "OCCUPIED") {
          // Exactly 1 occupant vehicle
          expect(bay.vehicleId).toBeTruthy();
          expect(bay.plate).toBeTruthy();
          expect(bay.model).toBeTruthy();
          // Strictly green or red color
          expect(["#10b981", "#ef4444"]).toContain(bay.color);
        } else if (bay.status === "AVAILABLE" || bay.status === "DESIGNATED") {
          // Exactly zero vehicles
          expect(bay.vehicleId).toBeNull();
          expect(bay.plate).toBeNull();
        }
      });
    });

    it("should verify empty bays are exactly SP-07, SP-11, SP-14, SP-17, SP-19", () => {
      const { spaces } = useSharedDemoState.getState();
      const emptyIds = Object.values(spaces)
        .filter((s) => s.status === "AVAILABLE" || s.status === "DESIGNATED")
        .map((s) => s.id)
        .sort();

      expect(emptyIds).toEqual([...INITIAL_AVAILABLE_SPACE_IDS].sort());
    });
  });

  describe("2. Persona Switching & User A Designated Space (Section 5)", () => {
    it("should designate SP-07 for Registered User A", () => {
      const state = useSharedDemoState.getState();
      state.setActivePersona("USER_A");

      const current = useSharedDemoState.getState();
      expect(current.activePersona).toBe("USER_A");
      expect(current.selectedSpaceId).toBe("SP-07");

      const sp07 = current.spaces["SP-07"];
      expect(sp07).toBeDefined();
      expect(sp07!.status).toBe("DESIGNATED");
      expect(sp07!.user).toBe("Registered User A");
      expect(sp07!.designatedFor).toContain("USER A");
    });
  });

  describe("3. User B Reservation Workflow (Section 6)", () => {
    it("should allow User B to reserve SP-14, updating status and decrementing available count", () => {
      const state = useSharedDemoState.getState();
      state.setActivePersona("USER_B");

      // Baseline available check
      const initialAvailable = Object.values(useSharedDemoState.getState().spaces).filter(
        (s) => s.status === "AVAILABLE"
      ).length;
      expect(initialAvailable).toBe(4); // SP-11, SP-14, SP-17, SP-19

      // USER B has no designated space before reservation
      const initialDesignated = Object.values(useSharedDemoState.getState().spaces).filter(
        (s) => s.status === "DESIGNATED" && s.designatedFor?.includes("USER B")
      ).length;
      expect(initialDesignated).toBe(0);

      // Reserve SP-14
      useSharedDemoState.getState().reserveSpace("SP-14", "USER_B");

      const updated = useSharedDemoState.getState();
      const sp14 = updated.spaces["SP-14"];
      expect(sp14).toBeDefined();
      expect(sp14!.status).toBe("RESERVED");
      expect(sp14!.user).toBe("Registered User B");
      // CRITICAL: A reservation is NOT a designation — designatedFor must be null
      expect(sp14!.designatedFor).toBeNull();
      expect(sp14!.reservation).toBe("CONFIRMED");

      // Verify available count decremented by 1
      const newAvailable = Object.values(updated.spaces).filter(
        (s) => s.status === "AVAILABLE"
      ).length;
      expect(newAvailable).toBe(initialAvailable - 1);

      // Verify USER B still has no designated space even after reservation
      const postReservationDesignated = Object.values(updated.spaces).filter(
        (s) => s.status === "DESIGNATED" && s.designatedFor?.includes("USER B")
      ).length;
      expect(postReservationDesignated).toBe(0);

      // Verify SP-07 remains DESIGNATED for USER A (not affected by USER B reservation)
      expect(updated.spaces["SP-07"]!.status).toBe("DESIGNATED");
      expect(updated.spaces["SP-07"]!.designatedFor).toContain("USER A");

      // Verify event was logged to activityEvents
      const event = updated.activityEvents[0];
      expect(event).toBeDefined();
      expect(event!.type).toBe("SPACE_RESERVED");
      expect(event!.spaceId).toBe("SP-14");
      expect(event!.user).toBe("Registered User B");
    });
  });

  describe("4. Guest User Availability (Section 7)", () => {
    it("should allow Guest persona to see live available spaces without pre-designation", () => {
      const state = useSharedDemoState.getState();
      state.setActivePersona("GUEST");

      const current = useSharedDemoState.getState();
      expect(current.activePersona).toBe("GUEST");

      const availableBays = Object.values(current.spaces).filter((s) => s.status === "AVAILABLE");
      expect(availableBays.length).toBeGreaterThan(0);
      expect(availableBays.some((s) => s.id === "SP-14")).toBe(true);
    });
  });

  describe("5. Violation Workflow (Section 8)", () => {
    it("should detect when VEH-001 parks in SP-11 instead of designated SP-07", () => {
      const state = useSharedDemoState.getState();
      state.triggerViolation();

      const current = useSharedDemoState.getState();
      expect(current.violation).not.toBeNull();
      expect(current.violation!.active).toBe(true);
      expect(current.violation!.vehicleId).toBe("VEH-001");
      expect(current.violation!.designatedSpaceId).toBe("SP-07");
      expect(current.violation!.actualSpaceId).toBe("SP-11");
      expect(current.violation!.severity).toBe("HIGH");

      // Target space SP-11 should be marked VIOLATION
      const sp11 = current.spaces["SP-11"];
      expect(sp11!.status).toBe("VIOLATION");
      expect(sp11!.isViolation).toBe(true);
      expect(sp11!.vehicleId).toBe("VEH-001");
      expect(sp11!.color).toBe("#ef4444"); // Red violation color

      // Activity event logged
      const violationEvt = current.activityEvents.find((e) => e.type === "PARKING_VIOLATION");
      expect(violationEvt).toBeDefined();
      expect(violationEvt!.severity).toBe("CRITICAL");
      expect(violationEvt!.message).toContain("PARKING VIOLATION");
    });

    it("should clear violation when clearViolation is called", () => {
      const state = useSharedDemoState.getState();
      state.triggerViolation();
      expect(useSharedDemoState.getState().violation).not.toBeNull();

      state.clearViolation();
      const current = useSharedDemoState.getState();
      expect(current.violation).toBeNull();
      expect(current.spaces["SP-11"]!.status).toBe("AVAILABLE");
      expect(current.spaces["SP-11"]!.vehicleId).toBeNull();
    });
  });

  describe("6. Deterministic Reset (Section 9)", () => {
    it("should restore exactly 15 occupied, 5 available, clear reservations and violations", () => {
      const state = useSharedDemoState.getState();
      // Apply mutations
      state.setActivePersona("USER_B");
      state.reserveSpace("SP-14", "USER_B");
      state.triggerViolation();

      // Reset
      state.resetAll();

      const resetState = useSharedDemoState.getState();
      expect(resetState.activePersona).toBe("USER_A");
      expect(resetState.violation).toBeNull();

      const list = Object.values(resetState.spaces);
      const occupied = list.filter((s) => s.status === "OCCUPIED");
      const available = list.filter((s) => s.status === "AVAILABLE");
      const designated = list.filter((s) => s.status === "DESIGNATED");

      expect(occupied.length).toBe(15);
      expect(available.length).toBe(4);
      expect(designated.length).toBe(1); // SP-07
      expect(resetState.spaces["SP-14"]!.status).toBe("AVAILABLE");
      expect(resetState.spaces["SP-11"]!.status).toBe("AVAILABLE");
    });
  });

  describe("7. Critical State Invariants & Spatial Consistency (Section 20)", () => {
    it("should assert all initial mathematical and spatial invariants", () => {
      const { spaces } = useSharedDemoState.getState();
      const list = Object.values(spaces);

      const total = list.length;
      const occupied = list.filter((s) => s.status === "OCCUPIED").length;
      const available = list.filter((s) => s.status === "AVAILABLE").length;
      const designated = list.filter((s) => s.status === "DESIGNATED").length;
      const reserved = list.filter((s) => s.status === "RESERVED").length;

      expect(total).toBe(20);
      expect(occupied).toBe(15);
      expect(available).toBe(4);
      expect(designated).toBe(1);
      expect(reserved).toBe(0);
      expect(occupied + available + designated).toBe(20);

      // Invariant: No space has more than one vehicle
      list.forEach((s) => {
        if (s.status === "OCCUPIED") {
          expect(s.vehicleId).toBeTruthy();
        } else {
          expect(s.vehicleId).toBeNull();
        }
      });

      // Invariant: No vehicle is assigned to more than one space
      const vehicleIds = list.map((s) => s.vehicleId).filter(Boolean);
      const uniqueVehicles = new Set(vehicleIds);
      expect(vehicleIds.length).toBe(15);
      expect(uniqueVehicles.size).toBe(15);
    });

    it("should assert mathematical invariants after USER B reservation", () => {
      const state = useSharedDemoState.getState();
      state.setActivePersona("USER_B");
      state.reserveSpace("SP-14", "USER_B");

      const list = Object.values(useSharedDemoState.getState().spaces);
      const total = list.length;
      const occupied = list.filter((s) => s.status === "OCCUPIED").length;
      const available = list.filter((s) => s.status === "AVAILABLE").length;
      const designated = list.filter((s) => s.status === "DESIGNATED").length;
      const reserved = list.filter((s) => s.status === "RESERVED").length;

      expect(total).toBe(20);
      expect(occupied).toBe(15);
      expect(available).toBe(3);
      expect(designated).toBe(1);
      expect(reserved).toBe(1);
      expect(occupied + available + designated + reserved).toBe(20);
    });

    it("should clear selectedSpaceId on switching to GUEST or unreserved USER B (Section 14)", () => {
      const state = useSharedDemoState.getState();

      // Start on USER A: SP-07 is selected
      state.setActivePersona("USER_A");
      expect(useSharedDemoState.getState().selectedSpaceId).toBe("SP-07");

      // Switch to GUEST: selection cleared so inspector returns to overview
      state.setActivePersona("GUEST");
      expect(useSharedDemoState.getState().selectedSpaceId).toBeNull();

      // Switch to USER B before reservation: selection cleared
      state.setActivePersona("USER_B");
      expect(useSharedDemoState.getState().selectedSpaceId).toBeNull();

      // Once USER B reserves SP-14, switching to USER B selects SP-14
      state.reserveSpace("SP-14", "USER_B");
      state.setActivePersona("GUEST");
      expect(useSharedDemoState.getState().selectedSpaceId).toBeNull();

      state.setActivePersona("USER_B");
      expect(useSharedDemoState.getState().selectedSpaceId).toBe("SP-14");
    });
  });
});
