import { describe, it, expect, beforeEach } from "vitest";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { CANONICAL_16_CAMERAS } from "@/components/digital-twin/demoScenarioData";
import { PROJECT_VIDEOS_MAP } from "@/components/video-library/VideoLibraryView";
import { deriveMovieAnalytics } from "@/components/analytics/movieAnalytics";

describe("ParkTwin AI — Final Bug-Fix Pass Verification Suite", () => {
  beforeEach(() => {
    useDemoMovieStore.getState().resetMovie();
  });

  // ==========================================================================
  // BUG 1: Video Directory / Video Library
  // ==========================================================================
  describe("Bug 1: Video Directory / Video Library Architecture", () => {
    it("should catalog all 16 canonical cameras in the video directory", () => {
      expect(CANONICAL_16_CAMERAS).toHaveLength(16);
      const camIds = CANONICAL_16_CAMERAS.map((c) => c.id);
      expect(camIds).toContain("CAM-01");
      expect(camIds).toContain("CAM-02");
      expect(camIds).toContain("CAM-03");
      expect(camIds).toContain("CAM-16");
    });

    it("should clearly map the 3 primary project demo videos with full metadata", () => {
      // CAM-01: Entry gate
      const cam1Videos = PROJECT_VIDEOS_MAP["CAM-01"];
      expect(cam1Videos).toBeDefined();
      expect(cam1Videos).toHaveLength(1);
      expect(cam1Videos![0]!.filename).toBe("cam1_entry_gate.mp4");
      expect(cam1Videos![0]!.cameraId).toBe("CAM-01");
      expect(cam1Videos![0]!.durationSeconds).toBe(12);
      expect(cam1Videos![0]!.fileSizeBytes).toBe(2264309);
      expect(cam1Videos![0]!.resolution).toContain("1080p");
      expect(cam1Videos![0]!.format).toContain("MP4");
      expect(cam1Videos![0]!.fps).toBe(30);

      // CAM-02: East vertical drive aisle (bay transit)
      const cam2Videos = PROJECT_VIDEOS_MAP["CAM-02"];
      expect(cam2Videos).toBeDefined();
      expect(cam2Videos).toHaveLength(1);
      expect(cam2Videos![0]!.filename).toBe("cam2_parking_bay.mp4");
      expect(cam2Videos![0]!.cameraId).toBe("CAM-02");
      expect(cam2Videos![0]!.durationSeconds).toBe(12);
      expect(cam2Videos![0]!.fileSizeBytes).toBe(2216801);

      // CAM-03: South perimeter corridor (never exit gate!)
      const cam3Videos = PROJECT_VIDEOS_MAP["CAM-03"];
      expect(cam3Videos).toBeDefined();
      expect(cam3Videos).toHaveLength(1);
      expect(cam3Videos![0]!.filename).toBe("cam3_exit_ramp.mp4");
      expect(cam3Videos![0]!.cameraId).toBe("CAM-03");
      expect(cam3Videos![0]!.durationSeconds).toBe(10);
      expect(cam3Videos![0]!.fileSizeBytes).toBe(1660795);
    });

    it("should verify that cameras without video (CAM-04 to CAM-16) are unconfigured / standby", () => {
      const standbyCamIds = [
        "CAM-04", "CAM-05", "CAM-06", "CAM-07",
        "CAM-08", "CAM-09", "CAM-10", "CAM-11",
        "CAM-12", "CAM-13", "CAM-14", "CAM-15", "CAM-16",
      ];

      standbyCamIds.forEach((id) => {
        const vids = PROJECT_VIDEOS_MAP[id];
        expect(vids === undefined || vids.length === 0).toBe(true);
      });
    });
  });

  // ==========================================================================
  // BUG 2: Analytics Connected to Demo Movie
  // ==========================================================================
  describe("Bug 2: Analytics Live Movie Synchronization", () => {
    it("should initialize analytics at t=0 with exactly 60 total slots, 20 occupied, 40 available (33.3%)", () => {
      const { spaces, vehicles } = useDemoMovieStore.getState();
      const analytics = deriveMovieAnalytics(0, spaces, vehicles);

      expect(analytics.occupancy.total_slots).toBe(60);
      expect(analytics.occupancy.current_occupancy).toBe(20);
      expect(analytics.occupancy.free_slots).toBe(40);
      expect(analytics.occupancy.occupancy_percentage).toBe(33.3);

      expect(analytics.traffic.active_vehicles).toBe(20);
      expect(analytics.traffic.vehicle_entries).toBe(20);
      expect(analytics.traffic.vehicle_exits).toBe(0);

      expect(analytics.utilization.total_slots).toBe(60);
      expect(analytics.utilization.used_slots).toBe(20);
      expect(analytics.utilization.slot_utilization_percentage).toBe(33.3);

      // Baseline timeline point
      expect(analytics.trends.occupancy_timeline.length).toBeGreaterThanOrEqual(1);
      expect(analytics.trends.occupancy_timeline[0]!.current_occupancy).toBe(20);
    });

    it("should reflect dynamic vehicle entries and bay parking as the movie ticks forward", () => {
      // Advance movie to t=30s (VEH-001 enters at t=4, parks at t=16 in SP-02; VEH-002 enters at t=12, parks at t=26 in SP-14)
      useDemoMovieStore.getState().tick(30);

      const { currentTime, spaces, vehicles } = useDemoMovieStore.getState();
      expect(currentTime).toBe(30);

      const analytics = deriveMovieAnalytics(currentTime, spaces, vehicles);

      // Both VEH-001 and VEH-002 are now parked -> occupied count increases by 2
      expect(analytics.occupancy.total_slots).toBe(60);
      expect(analytics.occupancy.current_occupancy).toBe(22);
      expect(analytics.occupancy.free_slots).toBe(38);
      expect(analytics.occupancy.occupancy_percentage).toBe(36.7);

      // Entries should be 20 baseline + 3 entrants (VEH-001, VEH-002, VEH-003) = 23
      expect(analytics.traffic.vehicle_entries).toBe(23);
      expect(analytics.traffic.active_vehicles).toBe(23);

      // Timeline charts should contain progressive snapshots up to t=30
      expect(analytics.trends.occupancy_timeline.length).toBeGreaterThanOrEqual(3);
      const latestSnapshot = analytics.trends.occupancy_timeline[analytics.trends.occupancy_timeline.length - 1]!;
      expect(latestSnapshot.current_occupancy).toBe(22);
    });

    it("should freeze analytics state completely when paused (no timer drift or simulated changes)", () => {
      useDemoMovieStore.getState().tick(25);
      useDemoMovieStore.getState().pauseMovie();

      const { currentTime, status, spaces, vehicles } = useDemoMovieStore.getState();
      expect(status).toBe("PAUSED");
      expect(currentTime).toBe(25);

      const snapshot1 = deriveMovieAnalytics(currentTime, spaces, vehicles);
      const snapshot2 = deriveMovieAnalytics(currentTime, spaces, vehicles);

      // Deep equality check: no drifting values while paused
      expect(snapshot1.occupancy.current_occupancy).toBe(snapshot2.occupancy.current_occupancy);
      expect(snapshot1.trends.occupancy_timeline.length).toBe(snapshot2.trends.occupancy_timeline.length);
    });

    it("should reset analytics cleanly back to deterministic t=0 baseline upon reset", () => {
      // Run movie forward to change state
      useDemoMovieStore.getState().tick(50);
      expect(useDemoMovieStore.getState().currentTime).toBe(50);

      // Execute reset
      useDemoMovieStore.getState().resetMovie();

      const { currentTime, status, spaces, vehicles } = useDemoMovieStore.getState();
      expect(status).toBe("READY");
      expect(currentTime).toBe(0);

      const resetAnalytics = deriveMovieAnalytics(currentTime, spaces, vehicles);
      expect(resetAnalytics.occupancy.total_slots).toBe(60);
      expect(resetAnalytics.occupancy.current_occupancy).toBe(20);
      expect(resetAnalytics.occupancy.free_slots).toBe(40);
      expect(resetAnalytics.occupancy.occupancy_percentage).toBe(33.3);
      expect(resetAnalytics.traffic.vehicle_entries).toBe(20);
      expect(resetAnalytics.traffic.active_vehicles).toBe(20);
    });
  });

  // ==========================================================================
  // BUG 3: Global Project Reset
  // ==========================================================================
  describe("Bug 3: Authoritative Global Project Reset", () => {
    it("should cleanly reset all movie timeline, space, vehicle, and selection states", () => {
      const store = useDemoMovieStore.getState();

      // Start movie and select entities
      store.startMovie();
      store.tick(40);
      store.selectVehicle("VEH-001");
      store.selectSlot("SP-02");
      store.selectCamera("CAM-01");

      const runningState = useDemoMovieStore.getState();
      expect(runningState.status).toBe("RUNNING");
      expect(runningState.currentTime).toBe(40);
      expect(runningState.selectedVehicleId).toBe("VEH-001");
      expect(runningState.selectedSlotId).toBe("SP-02");
      expect(runningState.selectedCameraId).toBe("CAM-01");

      // Execute authoritative reset
      store.resetMovie();

      const afterReset = useDemoMovieStore.getState();
      expect(afterReset.status).toBe("READY");
      expect(afterReset.currentTime).toBe(0);
      expect(afterReset.selectedVehicleId).toBeNull();
      expect(afterReset.selectedSlotId).toBeNull();
      expect(afterReset.selectedCameraId).toBeNull();
      expect(afterReset.events).toHaveLength(0);

      // Verify all 10 Type A vehicles return to UPCOMING
      const typeAVehicles = afterReset.vehicles.filter((v) => v.isTypeA);
      expect(typeAVehicles).toHaveLength(10);
      typeAVehicles.forEach((v) => {
        expect(v.state).toBe("UPCOMING");
        expect(v.currentPosition).toBeNull();
      });

      // Verify all 20 Type B vehicles remain PARKED in assigned slots
      const typeBVehicles = afterReset.vehicles.filter((v) => !v.isTypeA);
      expect(typeBVehicles).toHaveLength(20);
      typeBVehicles.forEach((v) => {
        expect(v.state).toBe("PARKED");
        expect(v.currentPosition).not.toBeNull();
      });

      // Verify spaces return to exactly 20 occupied and 40 available
      const occupiedSpaces = afterReset.spaces.filter((s) => s.isOccupied);
      const freeSpaces = afterReset.spaces.filter((s) => !s.isOccupied);
      expect(occupiedSpaces).toHaveLength(20);
      expect(freeSpaces).toHaveLength(40);
    });
  });
});
