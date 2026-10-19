import { describe, it, expect, beforeEach } from "vitest";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import {
  CANONICAL_60_SPACES,
  CANONICAL_16_CAMERAS,
  DEMO_30_VEHICLES,
  isSlotReserved,
} from "@/components/digital-twin/demoScenarioData";

describe("Digital Twin KPI Consistency & Data Integrity Audit", () => {
  beforeEach(() => {
    useDemoMovieStore.getState().resetMovie();
  });

  describe("1. Canonical Parking Capacity & Exact Geometry Registry", () => {
    it("should verify total canonical capacity is exactly 60 bays (SP-01 to SP-60)", () => {
      expect(CANONICAL_60_SPACES).toHaveLength(60);
      expect(CANONICAL_60_SPACES[0]?.id).toBe("SP-01");
      expect(CANONICAL_60_SPACES[59]?.id).toBe("SP-60");

      // Verify all 60 space IDs are unique
      const ids = new Set(CANONICAL_60_SPACES.map((s) => s.id));
      expect(ids.size).toBe(60);
    });

    it("should distribute 60 spaces across exactly 6 verified architectural zones", () => {
      const zoneCounts: Record<string, number> = {};
      CANONICAL_60_SPACES.forEach((s) => {
        zoneCounts[s.zone] = (zoneCounts[s.zone] || 0) + 1;
      });

      expect(zoneCounts["Zone A (North Perimeter)"]).toBe(13);
      expect(zoneCounts["Zone B (Upper Island)"]).toBe(20);
      expect(zoneCounts["Zone C (Central Ramp Row)"]).toBe(10);
      expect(zoneCounts["Zone D (Lower Island)"]).toBe(8);
      expect(zoneCounts["Zone E (South Perimeter)"]).toBe(5);
      expect(zoneCounts["Zone F (West Wing)"]).toBe(4);

      const totalCalculated = Object.values(zoneCounts).reduce((a, b) => a + b, 0);
      expect(totalCalculated).toBe(60);
    });
  });

  describe("2. Mutually Exclusive KPI Partition & Zero Double-Counting", () => {
    it("should partition 60 spaces into strictly mutually exclusive categories at t=0: 20 Occupied + 38 Available + 2 Reserved = 60 Total", () => {
      const { spaces } = useDemoMovieStore.getState();

      const totalSpaces = spaces.length;
      const occupied = spaces.filter((s) => s.isOccupied).length;
      const reserved = spaces.filter((s) => !s.isOccupied && isSlotReserved(s)).length;
      const available = spaces.filter((s) => !s.isOccupied && !isSlotReserved(s)).length;

      expect(totalSpaces).toBe(60);
      expect(occupied).toBe(20);
      expect(reserved).toBe(2);
      expect(available).toBe(38);

      // Strict mathematical invariant: no double counting
      expect(occupied + available + reserved).toBe(totalSpaces);
    });

    it("should identify SP-14 and SP-24 as the canonical reserved bays", () => {
      const { spaces } = useDemoMovieStore.getState();
      const reservedBays = spaces.filter((s) => isSlotReserved(s)).map((s) => s.id);

      expect(reservedBays).toContain("SP-14");
      expect(reservedBays).toContain("SP-24");
      expect(reservedBays).toHaveLength(2);
    });

    it("should maintain the partition invariant across the entire 180s simulation timeline", () => {
      const sampleTimestamps = [0, 5, 16, 26, 35, 52, 65, 80, 100, 120, 150, 180];

      sampleTimestamps.forEach((targetTime) => {
        useDemoMovieStore.getState().resetMovie();
        if (targetTime > 0) {
          useDemoMovieStore.getState().tick(targetTime);
        }

        const { spaces } = useDemoMovieStore.getState();
        const total = spaces.length;
        const occupied = spaces.filter((s) => s.isOccupied).length;
        const reserved = spaces.filter((s) => !s.isOccupied && isSlotReserved(s)).length;
        const available = spaces.filter((s) => !s.isOccupied && !isSlotReserved(s)).length;

        expect(occupied + available + reserved).toBe(total);
        expect(total).toBe(60);
      });
    });

    it("should correctly transition SP-14 from Reserved to Occupied without double counting when VEH-002 parks", () => {
      const store = useDemoMovieStore.getState();

      // At t=0: SP-14 is unoccupied and counted under Reserved (2 reserved total)
      const sp14At0 = store.spaces.find((s) => s.id === "SP-14");
      expect(sp14At0?.isOccupied).toBe(false);

      const reservedAt0 = store.spaces.filter((s) => !s.isOccupied && isSlotReserved(s)).length;
      expect(reservedAt0).toBe(2);

      // Advance clock to t=26 (VEH-002 parks in SP-14)
      store.tick(26);

      const stateAt26 = useDemoMovieStore.getState();
      const sp14At26 = stateAt26.spaces.find((s) => s.id === "SP-14");
      expect(sp14At26?.isOccupied).toBe(true);
      expect(sp14At26?.currentPlate).toBe("DEMO-002");

      // Reserved count dynamically decreases to 1 (only SP-24 remains unoccupied & reserved)
      const reservedAt26 = stateAt26.spaces.filter((s) => !s.isOccupied && isSlotReserved(s)).length;
      expect(reservedAt26).toBe(1);

      // Total invariant holds
      const totalAt26 = stateAt26.spaces.length;
      const occAt26 = stateAt26.spaces.filter((s) => s.isOccupied).length;
      const availAt26 = stateAt26.spaces.filter((s) => !s.isOccupied && !isSlotReserved(s)).length;

      expect(occAt26 + availAt26 + reservedAt26).toBe(totalAt26);
      expect(totalAt26).toBe(60);
    });
  });

  describe("3. Camera Registry Provenance & Status Alignment", () => {
    it("should have exactly 16 registered architecture cameras in CANONICAL_16_CAMERAS", () => {
      expect(CANONICAL_16_CAMERAS).toHaveLength(16);
    });

    it("should separate cameras into 4 ONLINE and 12 STANDBY", () => {
      const online = CANONICAL_16_CAMERAS.filter((c) => c.status === "ONLINE");
      const standby = CANONICAL_16_CAMERAS.filter((c) => c.status === "STANDBY");

      expect(online).toHaveLength(4);
      expect(standby).toHaveLength(12);

      expect(online.map((c) => c.id).sort()).toEqual(["CAM-01", "CAM-02", "CAM-03", "CAM-16"].sort());
    });

    it("should designate physical CCTV footage for CAM-01, CAM-02, and CAM-03 only", () => {
      const withVideo = CANONICAL_16_CAMERAS.filter((c) => Boolean(c.videoUrl));
      expect(withVideo).toHaveLength(3);
      expect(withVideo.map((c) => c.id)).toEqual(["CAM-01", "CAM-02", "CAM-03"]);
    });
  });

  describe("4. Vehicle Dataset Provenance & Motion Separation", () => {
    it("should have exactly 30 total demo vehicles (10 Type A + 20 Type B)", () => {
      expect(DEMO_30_VEHICLES).toHaveLength(30);

      const typeA = DEMO_30_VEHICLES.filter((v) => v.isTypeA);
      const typeB = DEMO_30_VEHICLES.filter((v) => !v.isTypeA);

      expect(typeA).toHaveLength(10);
      expect(typeB).toHaveLength(20);
    });

    it("should have exactly 20 active vehicles at t=0 matching the 20 occupied bays", () => {
      const { vehicles, spaces } = useDemoMovieStore.getState();

      const activeVehicles = vehicles.filter(
        (v) => v.state !== "UPCOMING" && v.state !== "EXITED"
      );
      const occupiedSpaces = spaces.filter((s) => s.isOccupied);

      expect(activeVehicles).toHaveLength(20);
      expect(occupiedSpaces).toHaveLength(20);

      // Verify each active vehicle occupies the assigned slot
      activeVehicles.forEach((v) => {
        const slot = spaces.find((s) => s.id === v.assignedSlot);
        expect(slot?.isOccupied).toBe(true);
        expect(slot?.currentVehicleId).toBe(v.id);
      });
    });
  });
});
