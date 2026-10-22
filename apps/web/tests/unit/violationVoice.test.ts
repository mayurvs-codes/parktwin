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
});
