import { describe, expect, it } from "vitest";
import {
  filterTimelineByRange,
  formatAxisHour,
  formatAxisTime,
  formatHour,
  hourlyToChartData,
  peakFromTimeline,
} from "@/components/analytics/chart-utils";
import type { OccupancyTimelinePoint } from "@/types/analytics";

describe("components/analytics/chart-utils.ts", () => {
  describe("formatAxisTime & formatAxisHour", () => {
    it("formatAxisTime formats ISO timestamp", () => {
      const formatted = formatAxisTime("2026-07-28T14:30:00Z");
      expect(formatted).not.toBe("—");
    });

    it("formatAxisTime handles null/undefined/invalid", () => {
      expect(formatAxisTime(null)).toBe("—");
      expect(formatAxisTime(undefined)).toBe("—");
      expect(formatAxisTime("invalid")).toBe("—");
    });

    it("formatAxisHour formats hour from ISO string", () => {
      const formatted = formatAxisHour("2026-07-28T14:30:00Z");
      expect(formatted).not.toBe("—");
    });

    it("formatAxisHour handles null/invalid", () => {
      expect(formatAxisHour(null)).toBe("—");
      expect(formatAxisHour("invalid")).toBe("—");
    });
  });

  describe("formatHour", () => {
    it("formats 9 as '09:00'", () => {
      expect(formatHour(9)).toBe("09:00");
    });

    it("formats 14 as '14:00'", () => {
      expect(formatHour(14)).toBe("14:00");
    });

    it("returns '—' for null or undefined", () => {
      expect(formatHour(null)).toBe("—");
      expect(formatHour(undefined)).toBe("—");
    });
  });

  describe("hourlyToChartData", () => {
    it("converts 24-hour map to 24 array points", () => {
      const input = { "9": 5, "14": 12 };
      const res = hourlyToChartData(input);
      expect(res).toHaveLength(24);
      expect(res[9]).toEqual({ hour: "09:00", entries: 5 });
      expect(res[14]).toEqual({ hour: "14:00", entries: 12 });
      expect(res[0]).toEqual({ hour: "00:00", entries: 0 });
    });
  });

  describe("filterTimelineByRange", () => {
    const points = [
      { timestamp: "2026-07-28T08:00:00Z", val: 1 },
      { timestamp: "2026-07-28T12:00:00Z", val: 2 },
      { timestamp: "2026-07-28T16:00:00Z", val: 3 },
    ];

    it("filters custom range with from and to", () => {
      const filtered = filterTimelineByRange(points, {
        key: "custom",
        from: "2026-07-28T10:00:00Z",
        to: "2026-07-28T14:00:00Z",
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.val).toBe(2);
    });

    it("returns all points if custom range boundaries are omitted", () => {
      const filtered = filterTimelineByRange(points, { key: "custom" });
      expect(filtered).toHaveLength(3);
    });
  });

  describe("peakFromTimeline", () => {
    it("returns null for empty timeline", () => {
      expect(peakFromTimeline([])).toBeNull();
    });

    it("finds the point with maximum occupancy_percentage", () => {
      const timeline: OccupancyTimelinePoint[] = [
        {
          timestamp: "2026-07-28T10:00:00Z",
          current_occupancy: 5,
          occupancy_percentage: 10.0,
          free_slots: 45,
          reserved_slots: 0,
        },
        {
          timestamp: "2026-07-28T12:00:00Z",
          current_occupancy: 25,
          occupancy_percentage: 50.0,
          free_slots: 25,
          reserved_slots: 0,
        },
        {
          timestamp: "2026-07-28T14:00:00Z",
          current_occupancy: 15,
          occupancy_percentage: 30.0,
          free_slots: 35,
          reserved_slots: 0,
        },
      ];
      const peak = peakFromTimeline(timeline);
      expect(peak).not.toBeNull();
      expect(peak?.occupancy_percentage).toBe(50.0);
      expect(peak?.timestamp).toBe("2026-07-28T12:00:00Z");
    });
  });
});
