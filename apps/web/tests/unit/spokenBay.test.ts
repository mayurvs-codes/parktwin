import { describe, it, expect } from "vitest";
import { parseSpokenBay } from "@/utils/spokenBay";

const FREE = ["SP-11", "SP-14", "SP-17", "SP-19"]; // D3, D6, B1, B3

describe("parseSpokenBay", () => {
  it("understands letter + digit, spaced or glued", () => {
    expect(parseSpokenBay("D3", FREE)).toMatchObject({ kind: "match", id: "SP-11" });
    expect(parseSpokenBay("bay d 6 please", FREE)).toMatchObject({ kind: "match", id: "SP-14" });
    expect(parseSpokenBay("b-1", FREE)).toMatchObject({ kind: "match", id: "SP-17" });
  });

  it("understands spoken letter sounds and number words", () => {
    expect(parseSpokenBay("dee three", FREE)).toMatchObject({ kind: "match", id: "SP-11" });
    expect(parseSpokenBay("bee won", FREE)).toMatchObject({ kind: "match", id: "SP-17" });
  });

  it("accepts the internal id", () => {
    expect(parseSpokenBay("SP 14", FREE)).toMatchObject({ kind: "match", id: "SP-14" });
  });

  it("refuses bays that are taken and unknown speech", () => {
    expect(parseSpokenBay("C7", FREE)).toEqual({ kind: "unavailable", label: "C7" });
    expect(parseSpokenBay("hello there", FREE)).toEqual({ kind: "none" });
  });
});
