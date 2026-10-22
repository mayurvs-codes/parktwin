import { describe, it, expect } from "vitest";
import { bayLabel, relabelBaysInText } from "@/utils/bayLabel";
import facility from "@/config/facility_geometry.json";
import { CANONICAL_60_SPACES } from "@/components/digital-twin/demoScenarioData";

describe("bay labels (row letter + consecutive number)", () => {
  it("maps internal ids and legacy aliases", () => {
    expect(bayLabel("SP-01")).toBe("C1");
    expect(bayLabel("P08")).toBe("C8");
    expect(bayLabel("SP-09")).toBe("D1");
    expect(bayLabel("SP-21")).toBe("A1");
    expect(bayLabel("SP-33")).toBe("A13");
    expect(bayLabel("SP-20")).toBe("B4");
    expect(bayLabel("SP-60")).toBe("E4");
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

  it("labels all 60 operational bays uniquely, consecutive within each row", () => {
    const rows: Record<string, number[]> = {};
    const seen = new Set<string>();
    for (const sp of CANONICAL_60_SPACES) {
      expect(sp.name).toBe(bayLabel(sp.id));
      expect(sp.name).toMatch(/^[A-Z]\d+$/);
      seen.add(sp.name);
      (rows[sp.name.charAt(0)] ??= []).push(Number(sp.name.slice(1)));
    }
    expect(seen.size).toBe(60);
    for (const nums of Object.values(rows)) {
      expect(nums.sort((a, b) => a - b)).toEqual(nums.map((_, i) => i + 1));
    }
  });

  it("relabels text", () => {
    expect(relabelBaysInText("Move from SP-11 to P07")).toBe("Move from D3 to C7");
  });
});
