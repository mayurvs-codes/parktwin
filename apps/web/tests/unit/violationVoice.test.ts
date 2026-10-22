import { describe, it, expect } from "vitest";
import { directionsToBay, wrongBayVoiceText } from "@/utils/violationVoice";

describe("violation voice", () => {
  it("speaks the warning then directions to the designated bay using row labels", () => {
    const text = wrongBayVoiceText("SP-11", "SP-07");
    expect(text).toContain("Warning! This is not your designated parking space. Please move to space C7.");
    expect(text).toContain("Bay C7 will be on your");
    expect(text).not.toMatch(/SP-\d\d/);
  });

  it("puts the north row on the left when driving toward higher x", () => {
    // SP-11 (lower row) -> SP-07 (upper row, 12 m to the right): drive right, bay on the left.
    expect(directionsToBay("SP-11", "SP-07")).toBe(
      "Back out into the aisle, turn right, and drive about 12 metres. Bay C7 will be on your left."
    );
  });

  it("keeps the side right when both bays are in the same row", () => {
    // SP-14 -> SP-11, both in the lower row: heading left, the lower row is on the driver's left.
    expect(directionsToBay("SP-14", "SP-11")).toContain("turn left");
    expect(directionsToBay("SP-14", "SP-11")).toContain("on your left");
    // SP-05 -> SP-02, both in the upper row: heading left, the upper row is on the driver's right.
    expect(directionsToBay("SP-05", "SP-02")).toContain("on your right");
  });
});
