import { describe, it, expect } from "vitest";
import {
  REAL_ARCHIVE_SEGMENTS,
  getPhysicalCameraGroups,
  ARCHIVE_FOLDER_PATH,
  ARCHIVE_RELATIVE_PATH,
} from "@/components/video-library/realArchiveRegistry";
import { PROJECT_VIDEOS_MAP } from "@/components/video-library/VideoLibraryView";
import { CANONICAL_16_CAMERAS } from "@/components/digital-twin/demoScenarioData";

describe("ParkTwin AI — Real Project Archive (27-Aug-2026) Registry & UX Verification", () => {
  // ==========================================================================
  // 1. ARCHIVE SEGMENT INVENTORY & PROVENANCE
  // ==========================================================================
  describe("1. Real Archive Inventory & Provenance", () => {
    it("should catalog all 33 real recorded MP4 files from 27-Aug-2026", () => {
      expect(REAL_ARCHIVE_SEGMENTS).toHaveLength(33);
    });

    it("should have valid metadata, durations, and file sizes for every segment", () => {
      REAL_ARCHIVE_SEGMENTS.forEach((seg) => {
        expect(seg.id).toBeDefined();
        expect(seg.filename).toMatch(/\.mp4$/);
        expect(seg.segmentCode).toMatch(/^[0-9]+[A-D]$/);
        expect(seg.physicalCameraNum).toBeGreaterThan(0);
        expect(seg.physicalCameraId).toBe(`IP Camera ${seg.physicalCameraNum}`);
        expect(seg.durationSeconds).toBeGreaterThan(0);
        expect(seg.durationLabel).toMatch(/^[0-9]{2}:[0-9]{2}$/);
        expect(seg.fileSizeBytes).toBeGreaterThan(1_000_000); // at least 1MB
        expect(seg.fileSizeLabel).toMatch(/MB$/);
        expect(seg.format).toContain("MP4");
        expect(seg.recordingDate).toBe("2026-08-27");
        expect(seg.facility).toBe("Carparking-01");
        expect(seg.sessionWindow).toBe("15:45–17:00");
        expect(seg.sourceType).toBe("RECORDED ARCHIVE");
        expect(seg.fullWindowsPath).toContain("27-Aug-2026");
        expect(seg.folderWindowsPath).toBe(ARCHIVE_FOLDER_PATH);
      });
    });

    it("should NEVER label any real archive segment as LIVE or LIVE CCTV", () => {
      REAL_ARCHIVE_SEGMENTS.forEach((seg) => {
        expect(seg.sourceType).toBe("RECORDED ARCHIVE");
        expect(seg.sourceType).not.toBe("LIVE");
      });
    });

    it("should maintain UNVERIFIED status for logical ParkTwin camera mapping", () => {
      REAL_ARCHIVE_SEGMENTS.forEach((seg) => {
        expect(seg.mappingStatus).toBe("UNVERIFIED");
        expect(seg.parkTwinCameraId).toBeNull();
      });
    });
  });

  // ==========================================================================
  // 2. PHYSICAL CAMERA SOURCES & GROUPING
  // ==========================================================================
  describe("2. Physical Camera Sources & Grouping", () => {
    it("should discover and group all 16 physical IP cameras", () => {
      const groups = getPhysicalCameraGroups();
      expect(groups).toHaveLength(16);

      const physicalCamNums = groups.map((g) => g.physicalCameraNum);
      const expectedNums = [3, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 19, 20, 21, 22, 24];
      expect(physicalCamNums).toEqual(expectedNums);
    });

    it("should group multi-segment cameras correctly", () => {
      const groups = getPhysicalCameraGroups();
      const groupMap = new Map(groups.map((g) => [g.physicalCameraNum, g]));

      // IP Camera 14: 4 segments (8A, 8B, 8C, 8D)
      const cam14 = groupMap.get(14);
      expect(cam14).toBeDefined();
      expect(cam14!.segments).toHaveLength(4);
      expect(cam14!.segments.map((s) => s.segmentCode)).toEqual(["8A", "8B", "8C", "8D"]);

      // IP Camera 9: 4 segments (5A, 5B, 5C, 5D)
      const cam9 = groupMap.get(9);
      expect(cam9).toBeDefined();
      expect(cam9!.segments).toHaveLength(4);
      expect(cam9!.segments.map((s) => s.segmentCode)).toEqual(["5A", "5B", "5C", "5D"]);

      // IP Camera 3: 2 segments (1A, 1B)
      const cam3 = groupMap.get(3);
      expect(cam3!.segments).toHaveLength(2);
      expect(cam3!.segments.map((s) => s.segmentCode)).toEqual(["1A", "1B"]);

      // IP Camera 5: 2 segments (16A, 16B)
      const cam5 = groupMap.get(5);
      expect(cam5!.segments).toHaveLength(2);
      expect(cam5!.segments.map((s) => s.segmentCode)).toEqual(["16A", "16B"]);

      // IP Camera 6: 2 segments (2A, 2B)
      const cam6 = groupMap.get(6);
      expect(cam6!.segments).toHaveLength(2);
      expect(cam6!.segments.map((s) => s.segmentCode)).toEqual(["2A", "2B"]);

      // IP Camera 7: 2 segments (4A, 4B)
      const cam7 = groupMap.get(7);
      expect(cam7!.segments).toHaveLength(2);
      expect(cam7!.segments.map((s) => s.segmentCode)).toEqual(["4A", "4B"]);

      // IP Camera 8: 2 segments (3A, 3B)
      const cam8 = groupMap.get(8);
      expect(cam8!.segments).toHaveLength(2);
      expect(cam8!.segments.map((s) => s.segmentCode)).toEqual(["3A", "3B"]);

      // IP Camera 10: 2 segments (6A, 6B)
      const cam10 = groupMap.get(10);
      expect(cam10!.segments).toHaveLength(2);
      expect(cam10!.segments.map((s) => s.segmentCode)).toEqual(["6A", "6B"]);

      // IP Camera 15: 2 segments (9A, 9B)
      const cam15 = groupMap.get(15);
      expect(cam15!.segments).toHaveLength(2);
      expect(cam15!.segments.map((s) => s.segmentCode)).toEqual(["9A", "9B"]);

      // IP Camera 16: 2 segments (10A, 10B)
      const cam16 = groupMap.get(16);
      expect(cam16!.segments).toHaveLength(2);
      expect(cam16!.segments.map((s) => s.segmentCode)).toEqual(["10A", "10B"]);

      // IP Camera 19: 2 segments (11A, 11B)
      const cam19 = groupMap.get(19);
      expect(cam19!.segments).toHaveLength(2);
      expect(cam19!.segments.map((s) => s.segmentCode)).toEqual(["11A", "11B"]);

      // IP Camera 20: 2 segments (12A, 12B)
      const cam20 = groupMap.get(20);
      expect(cam20!.segments).toHaveLength(2);
      expect(cam20!.segments.map((s) => s.segmentCode)).toEqual(["12A", "12B"]);

      // IP Camera 21: 2 segments (14A, 14B)
      const cam21 = groupMap.get(21);
      expect(cam21!.segments).toHaveLength(2);
      expect(cam21!.segments.map((s) => s.segmentCode)).toEqual(["14A", "14B"]);

      // Single segment cameras: 11, 22, 24
      expect(groupMap.get(11)!.segments).toHaveLength(1);
      expect(groupMap.get(22)!.segments).toHaveLength(1);
      expect(groupMap.get(24)!.segments).toHaveLength(1);
    });

    it("should calculate total storage correctly across all 33 files (~14.96 GB)", () => {
      const totalBytes = REAL_ARCHIVE_SEGMENTS.reduce((sum, s) => sum + s.fileSizeBytes, 0);
      expect(totalBytes).toBe(14961061816);
      const totalGb = totalBytes / (1024 * 1024 * 1024);
      expect(totalGb).toBeCloseTo(13.933, 2);
      const decimalGb = totalBytes / 1e9;
      expect(decimalGb).toBeCloseTo(14.961, 2);
    });
  });

  // ==========================================================================
  // 3. SEPARATION OF CONCERNS: REAL ARCHIVE VS. DEMO REPLAY ASSETS
  // ==========================================================================
  describe("3. Real Archive vs. Demo Replay Separation", () => {
    it("should preserve deterministic demo MP4 assets under PROJECT_VIDEOS_MAP", () => {
      expect(PROJECT_VIDEOS_MAP["CAM-01"]).toBeDefined();
      expect(PROJECT_VIDEOS_MAP["CAM-02"]).toBeDefined();
      expect(PROJECT_VIDEOS_MAP["CAM-03"]).toBeDefined();
    });

    it("should maintain 16 canonical facility cameras in CANONICAL_16_CAMERAS", () => {
      expect(CANONICAL_16_CAMERAS).toHaveLength(16);
      expect(CANONICAL_16_CAMERAS[0]!.id).toBe("CAM-01");
      expect(CANONICAL_16_CAMERAS[15]!.id).toBe("CAM-16");
    });
  });
});
