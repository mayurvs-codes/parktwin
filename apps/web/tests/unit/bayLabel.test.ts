import { describe, it, expect } from "vitest";
import { bayLabel, relabelBaysInText } from "@/utils/bayLabel";
import facility from "@/config/facility_geometry.json";

describe("bay labels (row letter + consecutive number)", () => {
  it("maps internal ids and legacy aliases", () => {
    expect(bayLabel("SP-01")).toBe("B1");
    expect(bayLabel("P08")).toBe("B8");
    expect(bayLabel("SP-09")).toBe("C1");
    expect(bayLabel("SP-21")).toBe("A1");
    expect(bayLabel("SP-20")).toBe("D4");
    expect(bayLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("numbers every row consecutively from 1 with unique labels", () => {
    const rows: Record<string, number[]> = {};
    const labels = new Set<string>();
    for (const b of facility.bays as unknown as { label: string; row: string; number: number }[]) {
      (rows[b.row] ??= []).push(b.number);
      labels.add(b.label);
    }
    for (const nums of Object.values(rows)) {
      expect(nums.sort((a, b) => a - b)).toEqual(nums.map((_, i) => i + 1));
    }
    expect(labels.size).toBe(facility.bays.length);
  });

  it("relabels text", () => {
    expect(relabelBaysInText("Move from SP-11 to P07")).toBe("Move from C3 to B7");
  });
});
