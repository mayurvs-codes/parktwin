import { describe, it, expect, beforeEach } from "vitest";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import {
  ACCESS_POINT_B2,
  CANONICAL_16_CAMERAS,
  CANONICAL_60_SPACES,
  DEMO_30_VEHICLES,
} from "@/components/digital-twin/demoScenarioData";

describe("Demo Movie Engine & Canonical Presentation Architecture", () => {
  beforeEach(() => {
    useDemoMovieStore.getState().resetMovie();
  });

  describe("Single Gateway Authority", () => {
    it("should have exactly ONE physical bidirectional gateway ACCESS_POINT_B2 at (1105, 55)", () => {
      expect(ACCESS_POINT_B2.id).toBe("ACCESS_POINT_B2");
      expect(ACCESS_POINT_B2.x).toBe(1105);
      expect(ACCESS_POINT_B2.y).toBe(55);
      expect(ACCESS_POINT_B2.name).toContain("Entry & Exit");
    });
  });

  describe("60 Operational Parking Spaces Inventory", () => {
    it("should define exactly 60 parking spaces (SP-01 to SP-60)", () => {
      expect(CANONICAL_60_SPACES).toHaveLength(60);
      expect(CANONICAL_60_SPACES[0]?.id).toBe("SP-01");
      expect(CANONICAL_60_SPACES[59]?.id).toBe("SP-60");
    });

    it("should span all 6 facility zones (Zones A through F)", () => {
      const zones = new Set(CANONICAL_60_SPACES.map((s) => s.zone));
      expect(zones.has("Zone A (North Perimeter)")).toBe(true);
      expect(zones.has("Zone B (Upper Island)")).toBe(true);
      expect(zones.has("Zone C (Central Ramp Row)")).toBe(true);
      expect(zones.has("Zone D (Lower Island)")).toBe(true);
      expect(zones.has("Zone E (South Perimeter)")).toBe(true);
      expect(zones.has("Zone F (West Wing)")).toBe(true);
      expect(zones.size).toBe(6);
    });
  });

  describe("16-Camera Architecture & Roles", () => {
    it("should define all 16 cameras (CAM-01 through CAM-16)", () => {
      expect(CANONICAL_16_CAMERAS).toHaveLength(16);
      expect(CANONICAL_16_CAMERAS.map((c) => c.id)).toEqual([
        "CAM-01", "CAM-02", "CAM-03", "CAM-04",
        "CAM-05", "CAM-06", "CAM-07", "CAM-08",
        "CAM-09", "CAM-10", "CAM-11", "CAM-12",
        "CAM-13", "CAM-14", "CAM-15", "CAM-16",
      ]);
    });

    it("should assign canonical roles: CAM-01=ENTRY, CAM-02..15=PATH/PARKING, CAM-16=EXIT", () => {
      const cam01 = CANONICAL_16_CAMERAS.find((c) => c.id === "CAM-01");
      const cam02 = CANONICAL_16_CAMERAS.find((c) => c.id === "CAM-02");
      const cam03 = CANONICAL_16_CAMERAS.find((c) => c.id === "CAM-03");
      const cam16 = CANONICAL_16_CAMERAS.find((c) => c.id === "CAM-16");

      expect(cam01?.role).toBe("ENTRY");
      expect(cam02?.role).toBe("PATH/PARKING");
      expect(cam03?.role).toBe("PATH/PARKING");
      expect(cam03?.role).not.toBe("EXIT");
      expect(cam03?.label).not.toMatch(/exit/i);
      expect(cam16?.role).toBe("EXIT");
    });
  });

  describe("30 Vehicles Model & Separation", () => {
    it("should define exactly 30 demo vehicles (VEH-001 to VEH-030)", () => {
      expect(DEMO_30_VEHICLES).toHaveLength(30);
      expect(DEMO_30_VEHICLES[0]?.id).toBe("VEH-001");
      expect(DEMO_30_VEHICLES[29]?.id).toBe("VEH-030");
    });

    it("should separate into exactly 10 Type A (tracked) and 20 Type B (static) vehicles", () => {
      const typeA = DEMO_30_VEHICLES.filter((v) => v.isTypeA);
      const typeB = DEMO_30_VEHICLES.filter((v) => !v.isTypeA);

      expect(typeA).toHaveLength(10);
      expect(typeB).toHaveLength(20);

      // All Type A have valid entry routes and parkTime > entryTime
      typeA.forEach((v) => {
        expect(v.entryRoute.length).toBeGreaterThan(1);
        expect(v.parkTime).toBeGreaterThan(v.entryTime);
      });

      // Type B have NO fake routes and are parked at t=0
      typeB.forEach((v) => {
        expect(v.entryRoute).toHaveLength(0);
        expect(v.exitRoute).toHaveLength(0);
        expect(v.entryTime).toBe(0);
      });
    });
  });

  describe("Initial State & Dwell Baseline", () => {
    it("should initialize store with 20 occupied (GREEN) and 40 available (RED) spaces", () => {
      const { spaces, vehicles, status, currentTime } = useDemoMovieStore.getState();

      expect(status).toBe("READY");
      expect(currentTime).toBe(0);

      const occupiedSpaces = spaces.filter((s) => s.isOccupied);
      const freeSpaces = spaces.filter((s) => !s.isOccupied);

      expect(occupiedSpaces).toHaveLength(20);
      expect(freeSpaces).toHaveLength(40);

      // All 20 Type B vehicles should be in PARKED state
      const parkedVehicles = vehicles.filter((v) => v.state === "PARKED");
      expect(parkedVehicles).toHaveLength(20);

      // All 10 Type A vehicles should be UPCOMING at t=0
      const upcomingVehicles = vehicles.filter((v) => v.state === "UPCOMING");
      expect(upcomingVehicles).toHaveLength(10);
    });
  });

  describe("Movie Progression & Dynamic Lifecycle", () => {
    it("should advance Type A vehicle VEH-001 from UPCOMING to ENTERING and then PARKED", () => {
      const store = useDemoMovieStore.getState();

      // At t=0, VEH-001 is UPCOMING
      expect(store.vehicles[0]?.state).toBe("UPCOMING");

      // Advance clock to t=5 (VEH-001 enters at t=4, parks at t=14)
      store.tick(5);

      const stateAt5 = useDemoMovieStore.getState();
      const veh1At5 = stateAt5.vehicles.find((v) => v.id === "VEH-001");
      expect(veh1At5?.state).toBe("ENTERING");
      expect(veh1At5?.currentPosition).not.toBeNull();

      // Space SP-02 is still AVAILABLE before it parks
      const space02At5 = stateAt5.spaces.find((s) => s.id === "SP-02");
      expect(space02At5?.isOccupied).toBe(false);

      // Advance clock past parkTime (t=16)
      useDemoMovieStore.getState().tick(11);

      const stateAt16 = useDemoMovieStore.getState();
      const veh1At16 = stateAt16.vehicles.find((v) => v.id === "VEH-001");
      expect(veh1At16?.state).toBe("PARKED");

      // Space SP-02 flips to OCCUPIED!
      const space02At16 = stateAt16.spaces.find((s) => s.id === "SP-02");
      expect(space02At16?.isOccupied).toBe(true);
      expect(space02At16?.currentPlate).toBe("DEMO-001");
    });

    it("should advance VEH-001 to EXITING, flip bay back to AVAILABLE, and DISAPPEAR upon exit", () => {
      const store = useDemoMovieStore.getState();

      // Advance clock to park VEH-001 (t=16)
      store.tick(16);

      // VEH-001 exit starts at t=95, completes at t=105
      useDemoMovieStore.getState().tick(84); // currentTime = 100

      const stateAt100 = useDemoMovieStore.getState();
      const veh1At100 = stateAt100.vehicles.find((v) => v.id === "VEH-001");
      expect(veh1At100?.state).toBe("EXITING");

      // Space SP-02 has flipped back to AVAILABLE!
      const space02At100 = stateAt100.spaces.find((s) => s.id === "SP-02");
      expect(space02At100?.isOccupied).toBe(false);

      // Advance clock past exitCompleteTime (t=106)
      useDemoMovieStore.getState().tick(10); // currentTime = 110

      const stateAt110 = useDemoMovieStore.getState();
      const veh1At110 = stateAt110.vehicles.find((v) => v.id === "VEH-001");
      expect(veh1At110?.state).toBe("EXITED");
      expect(veh1At110?.currentPosition).toBeNull(); // Vehicle disappears!
    });
  });

  describe("Global Pause Contract", () => {
    it("should halt time and freeze all state upon pauseMovie", () => {
      const store = useDemoMovieStore.getState();
      store.startMovie();
      store.tick(10);

      const timeBeforePause = useDemoMovieStore.getState().currentTime;
      store.pauseMovie();

      expect(useDemoMovieStore.getState().status).toBe("PAUSED");

      // In PAUSED mode, time does not advance
      expect(useDemoMovieStore.getState().currentTime).toBe(timeBeforePause);

      // Resume continues from the exact same point
      store.resumeMovie();
      expect(useDemoMovieStore.getState().status).toBe("RUNNING");
    });
  });

  describe("Project Reset Contract", () => {
    it("should restore full deterministic t=0 state upon resetMovie", () => {
      const store = useDemoMovieStore.getState();
      store.startMovie();
      store.tick(50);

      expect(useDemoMovieStore.getState().currentTime).toBe(50);

      store.resetMovie();

      const freshState = useDemoMovieStore.getState();
      expect(freshState.status).toBe("READY");
      expect(freshState.currentTime).toBe(0);
      expect(freshState.spaces.filter((s) => s.isOccupied)).toHaveLength(20);
      expect(freshState.spaces.filter((s) => !s.isOccupied)).toHaveLength(40);
      expect(freshState.events).toHaveLength(0);
    });
  });
});
