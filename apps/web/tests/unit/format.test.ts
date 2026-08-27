import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatConfidence,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatTime,
  isToday,
  elapsedSecondsFrom,
} from "@/lib/format";

describe("lib/format.ts", () => {
  describe("formatNumber", () => {
    it("formats normal integer correctly", () => {
      expect(formatNumber(1234)).toBe("1,234");
    });

    it("formats zero correctly", () => {
      expect(formatNumber(0)).toBe("0");
    });

    it("returns '0' for NaN", () => {
      expect(formatNumber(NaN)).toBe("0");
    });

    it("returns '0' for Infinity", () => {
      expect(formatNumber(Infinity)).toBe("0");
    });
  });

  describe("formatPercent", () => {

    it("formats positive rate with 1 decimal", () => {
      expect(formatPercent(42.56)).toBe("42.6%");
    });

    it("formats 0%", () => {
      expect(formatPercent(0)).toBe("0.0%");
    });

    it("returns '0%' for NaN", () => {
      expect(formatPercent(NaN)).toBe("0%");
    });

    it("returns '0%' for Infinity", () => {
      expect(formatPercent(-Infinity)).toBe("0%");
    });
  });

  describe("formatDuration", () => {
    it("formats hours and minutes for >3600s", () => {
      expect(formatDuration(3665)).toBe("1h 1m");
    });

    it("formats minutes and seconds for >60s and <3600s", () => {
      expect(formatDuration(252)).toBe("4m 12s");
    });

    it("formats seconds for <60s", () => {
      expect(formatDuration(9)).toBe("9s");
    });

    it("returns '—' for 0 seconds", () => {
      expect(formatDuration(0)).toBe("—");
    });

    it("returns '—' for negative numbers", () => {
      expect(formatDuration(-10)).toBe("—");
    });

    it("returns '—' for NaN", () => {
      expect(formatDuration(NaN)).toBe("—");
    });
  });

  describe("formatDateTime", () => {
    it("formats valid ISO timestamp", () => {
      const result = formatDateTime("2026-07-28T12:30:00Z");
      expect(result).not.toBe("—");
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns '—' for null or undefined", () => {
      expect(formatDateTime(null)).toBe("—");
      expect(formatDateTime(undefined)).toBe("—");
    });

    it("returns '—' for invalid ISO string", () => {
      expect(formatDateTime("invalid-date")).toBe("—");
    });
  });

  describe("formatClock", () => {
    it("formats zero seconds as '0:00'", () => {
      expect(formatClock(0)).toBe("0:00");
    });

    it("formats clock with padded seconds", () => {
      expect(formatClock(65)).toBe("1:05");
    });

    it("formats multi-minute clock", () => {
      expect(formatClock(750)).toBe("12:30");
    });

    it("returns '0:00' for negative seconds", () => {
      expect(formatClock(-5)).toBe("0:00");
    });

    it("returns '0:00' for NaN", () => {
      expect(formatClock(NaN)).toBe("0:00");
    });
  });

  describe("formatConfidence", () => {
    it("formats 0.92 ratio as '92%'", () => {
      expect(formatConfidence(0.92)).toBe("92%");
    });

    it("rounds float confidence ratios", () => {
      expect(formatConfidence(0.856)).toBe("86%");
    });

    it("returns '—' for null or undefined", () => {
      expect(formatConfidence(null)).toBe("—");
      expect(formatConfidence(undefined)).toBe("—");
    });

    it("returns '—' for NaN", () => {
      expect(formatConfidence(NaN)).toBe("—");
    });
  });

  describe("isToday", () => {
    it("returns true for today's ISO string", () => {
      const nowIso = new Date().toISOString();
      expect(isToday(nowIso)).toBe(true);
    });

    it("returns false for a past date ISO string", () => {
      expect(isToday("2020-01-01T00:00:00Z")).toBe(false);
    });

    it("returns false for null or undefined", () => {
      expect(isToday(null)).toBe(false);
      expect(isToday(undefined)).toBe(false);
    });

    it("returns false for invalid date string", () => {
      expect(isToday("not-a-date")).toBe(false);
    });
  });

  describe("elapsedSecondsFrom", () => {
    it("returns elapsed seconds from a past ISO timestamp", () => {
      const pastMs = Date.now() - 5000;
      const pastIso = new Date(pastMs).toISOString();
      expect(elapsedSecondsFrom(pastIso)).toBeGreaterThanOrEqual(4);
    });

    it("returns 0 for future ISO timestamp", () => {
      const futureIso = new Date(Date.now() + 10000).toISOString();
      expect(elapsedSecondsFrom(futureIso)).toBe(0);
    });

    it("returns 0 for null or undefined", () => {
      expect(elapsedSecondsFrom(null)).toBe(0);
      expect(elapsedSecondsFrom(undefined)).toBe(0);
    });

    it("returns 0 for invalid date string", () => {
      expect(elapsedSecondsFrom("invalid")).toBe(0);
    });
  });

  describe("formatRelativeTime & formatTime", () => {
    it("formatRelativeTime handles null and invalid", () => {
      expect(formatRelativeTime(null)).toBe("—");
      expect(formatRelativeTime("invalid")).toBe("—");
    });

    it("formatTime handles null and invalid", () => {
      expect(formatTime(null)).toBe("—");
      expect(formatTime("invalid")).toBe("—");
    });
  });
});
