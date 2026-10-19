import { describe, it, expect, beforeEach } from "vitest";
import {
  PARKING_DURATION_THRESHOLD_SECONDS,
  PARKING_DURATION_WARNING_THRESHOLD_SECONDS,
  formatDurationDisplay,
  checkVehicleInSameSpace,
  evaluateParkingDuration,
  type MonitoredParkingSession,
} from "@/services/parkingDurationMonitor";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useSharedDemoState } from "@/store/useSharedDemoState";

describe("Parking Duration Monitoring & Long-Stay Alert System", () => {
  beforeEach(() => {
    useUserPortalStore.getState().resetDemo();
    useSharedDemoState.getState().resetAll();
  });

  describe("1. Core Duration Monitoring Rules & Thresholds", () => {
    it("should strictly enforce 10-minute (600 seconds) long-stay alert threshold", () => {
      expect(PARKING_DURATION_THRESHOLD_SECONDS).toBe(600);
      expect(PARKING_DURATION_WARNING_THRESHOLD_SECONDS).toBe(480);
    });

    it("should format duration into HH:MM:SS format accurately", () => {
      expect(formatDurationDisplay(0)).toBe("00:00:00");
      expect(formatDurationDisplay(59)).toBe("00:00:59");
      expect(formatDurationDisplay(60)).toBe("00:01:00");
      expect(formatDurationDisplay(480)).toBe("00:08:00");
      expect(formatDurationDisplay(599)).toBe("00:09:59");
      expect(formatDurationDisplay(600)).toBe("00:10:00");
      expect(formatDurationDisplay(601)).toBe("00:10:01");
      expect(formatDurationDisplay(3665)).toBe("01:01:05");
    });

    it("should accurately verify continuous bay occupancy (same space check)", () => {
      // (sessionSpaceId, currentSpaceId, spaceOccupantVehicleId, currentVehicleId)
      expect(checkVehicleInSameSpace("SP-07", "SP-07", "VEH-001", "VEH-001")).toBe(true);

      // Vehicle in different space
      expect(checkVehicleInSameSpace("SP-07", "SP-11", "VEH-001", "VEH-001")).toBe(false);

      // Different vehicle occupant in space
      expect(checkVehicleInSameSpace("SP-07", "SP-07", "VEH-002", "VEH-001")).toBe(false);

      // Null / empty checks
      expect(checkVehicleInSameSpace(null, "SP-07", "VEH-001", "VEH-001")).toBe(false);
      expect(checkVehicleInSameSpace("SP-07", null, "VEH-001", "VEH-001")).toBe(false);
      expect(checkVehicleInSameSpace("SP-07", "SP-07", "VEH-001", null)).toBe(false);
    });
  });

  describe("2. Duration Evaluation State Machine", () => {
    it("should return NORMAL status when duration is under 8 minutes", () => {
      const session: MonitoredParkingSession = {
        spaceId: "SP-07",
        vehicleId: "VEH-001",
        durationSeconds: 300,
        isParked: true,
      };
      const res = evaluateParkingDuration(session, "SP-07", "VEH-001");
      expect(res.status).toBe("NORMAL");
      expect(res.isExceeded).toBe(false);
      expect(res.isStillInSameSpace).toBe(true);
      expect(res.formattedDuration).toBe("00:05:00");
    });

    it("should return WARNING status when duration is between 8 and 10 minutes", () => {
      const session: MonitoredParkingSession = {
        spaceId: "SP-07",
        vehicleId: "VEH-001",
        durationSeconds: 500,
        isParked: true,
      };
      const res = evaluateParkingDuration(session, "SP-07", "VEH-001");
      expect(res.status).toBe("WARNING");
      expect(res.isExceeded).toBe(false);
      expect(res.isStillInSameSpace).toBe(true);
      expect(res.formattedDuration).toBe("00:08:20");
    });

    it("should trigger LONG_STAY_ALERT when duration is >= 600s AND vehicle is STILL in the same space", () => {
      const session: MonitoredParkingSession = {
        spaceId: "SP-07",
        vehicleId: "VEH-001",
        durationSeconds: 600,
        isParked: true,
      };
      const res = evaluateParkingDuration(session, "SP-07", "VEH-001");
      expect(res.status).toBe("LONG_STAY_ALERT");
      expect(res.isExceeded).toBe(true);
      expect(res.isStillInSameSpace).toBe(true);
      expect(res.formattedDuration).toBe("00:10:00");
      expect(res.message).toContain("10-minute parking duration limit");
    });

    it("CRITICAL RULE: should NOT trigger alert if vehicle is NOT in the same space even if duration >= 600s", () => {
      const session: MonitoredParkingSession = {
        spaceId: "SP-07",
        vehicleId: "VEH-001",
        durationSeconds: 750,
        isParked: true,
      };
      // Vehicle has moved to SP-11
      const res = evaluateParkingDuration(session, "SP-11", "VEH-001");
      expect(res.status).toBe("NORMAL");
      expect(res.isExceeded).toBe(false);
      expect(res.isStillInSameSpace).toBe(false);
      expect(res.message).toContain("no longer in the same parking space");
    });
  });

  describe("3. End-to-End User Portal & Shared Demo State Integration", () => {
    it("should track parking duration and trigger long stay alert when advanced by 10 minutes", () => {
      // 1. Select vehicle VEH-001 (User A)
      useUserPortalStore.getState().selectVehicle("VEH-001");
      expect(useUserPortalStore.getState().assignedSpaceId).toBe("SP-07");

      // 2. Start navigation and arrive at space
      useUserPortalStore.getState().startNavigation();
      const arrived = useUserPortalStore.getState().arriveAtSpace();
      expect(arrived).toBe(true);

      // Verify parked state
      const state = useUserPortalStore.getState();
      expect(state.journeyStep).toBe("PARKED");
      expect(state.activeSession).not.toBeNull();
      expect(state.activeSession?.spaceId).toBe("SP-07");

      // Also ensure shared state reflects occupied SP-07
      useSharedDemoState.getState().occupySpace("SP-07", "VEH-001", "KA04MN8049");
      expect(useSharedDemoState.getState().spaces["SP-07"]!.status).toBe("OCCUPIED");

      // Advance session time by 10 minutes (600 seconds)
      useUserPortalStore.getState().advanceSessionTime(600);

      // Verify session duration is at least 600s
      const advancedState = useUserPortalStore.getState();
      expect(advancedState.sessionDurationSeconds).toBeGreaterThanOrEqual(600);

      // Verify long stay alert is triggered in shared state
      const alert = useSharedDemoState.getState().longStayAlert;
      expect(alert).not.toBeNull();
      expect(alert?.spaceId).toBe("SP-07");
      expect(alert?.vehicleId).toBe("VEH-001");
      expect(alert?.durationSeconds).toBeGreaterThanOrEqual(600);

      // Focused space should have isLongStay flag set
      expect(useSharedDemoState.getState().spaces["SP-07"]!.isLongStay).toBe(true);

      // Shared activity events should log the LONG_STAY_ALERT event
      const events = useSharedDemoState.getState().activityEvents;
      const longStayEvent = events.find((e) => e.type === "LONG_STAY_ALERT");
      expect(longStayEvent).toBeDefined();
      expect(longStayEvent?.spaceId).toBe("SP-07");
    });

    it("should clear long-stay alert immediately upon vehicle exit / release", () => {
      // Setup parked vehicle and trigger alert
      useUserPortalStore.getState().selectVehicle("VEH-001");
      useUserPortalStore.getState().startNavigation();
      useUserPortalStore.getState().arriveAtSpace();
      useSharedDemoState.getState().occupySpace("SP-07", "VEH-001", "KA04MN8049");

      useUserPortalStore.getState().advanceSessionTime(600);
      expect(useSharedDemoState.getState().longStayAlert).not.toBeNull();

      // Driver requests exit
      useUserPortalStore.getState().requestExit();

      // Long stay alert must be cleared
      expect(useSharedDemoState.getState().longStayAlert).toBeNull();
      expect(useSharedDemoState.getState().spaces["SP-07"]!.isLongStay).toBe(false);
    });

    it("should clear long-stay alert upon resetJourney or resetAll", () => {
      // Setup parked vehicle and trigger alert
      useUserPortalStore.getState().selectVehicle("VEH-001");
      useUserPortalStore.getState().startNavigation();
      useUserPortalStore.getState().arriveAtSpace();
      useSharedDemoState.getState().occupySpace("SP-07", "VEH-001", "KA04MN8049");

      useUserPortalStore.getState().advanceSessionTime(600);
      expect(useSharedDemoState.getState().longStayAlert).not.toBeNull();

      // Reset
      useUserPortalStore.getState().resetJourney();

      expect(useSharedDemoState.getState().longStayAlert).toBeNull();
      expect(useUserPortalStore.getState().activeSession).toBeNull();
    });
  });
});
