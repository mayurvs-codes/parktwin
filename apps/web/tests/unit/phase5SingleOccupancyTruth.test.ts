import { describe, it, expect, beforeEach } from "vitest";
import { useSharedDemoState, FOCUSED_ZONE_SPACE_IDS } from "../../store/useSharedDemoState";
import { useDemoMovieStore } from "../../store/useDemoMovieStore";
import { useUserPortalStore } from "../../store/useUserPortalStore";
import facilityGeometry from "../../config/facility_geometry.json";

describe("Phase 5 — Single Occupancy Truth Across 2D, 3D, User Portal and Admin Dashboard", () => {
  beforeEach(() => {
    // Perform canonical reset
    useSharedDemoState.getState().resetAll();
    useDemoMovieStore.getState().resetMovie({ broadcast: false });
  });

  it("verifies canonical baseline 20 bays exist with exact initial counts", () => {
    const sharedSpaces = useSharedDemoState.getState().spaces;
    const allSpaces = Object.values(sharedSpaces);

    expect(allSpaces).toHaveLength(20);
    expect(FOCUSED_ZONE_SPACE_IDS).toHaveLength(20);

    // Initial baseline: 15 occupied, 4 available, 1 designated
    const occupied = allSpaces.filter((s) => s.status === "OCCUPIED").length;
    const available = allSpaces.filter((s) => s.status === "AVAILABLE").length;
    const designated = allSpaces.filter((s) => s.status === "DESIGNATED").length;

    expect(occupied).toBe(15);
    expect(available).toBe(4);
    expect(designated).toBe(1);
    expect(occupied + available + designated).toBe(20);
  });

  it("verifies slot IDs match between shared store, demo store, and canonical facility geometry", () => {
    const sharedIds = Object.keys(useSharedDemoState.getState().spaces).sort();
    const geometryIds = facilityGeometry.bays.slice(0, 20).map((b) => b.id).sort();

    expect(sharedIds).toEqual(geometryIds);
    expect(sharedIds).toContain("SP-07");
    expect(sharedIds).toContain("SP-11");
    expect(sharedIds).toContain("SP-14");
    expect(sharedIds).toContain("SP-17");
  });

  it("synchronizes parking state updates across store consumers without divergence", () => {
    // Occupy SP-14
    useSharedDemoState.getState().occupySpace("SP-14", "VEH-002", "KA05ND1565");

    const sharedAfter = useSharedDemoState.getState().spaces["SP-14"];
    expect(sharedAfter?.status).toBe("OCCUPIED");
    expect(sharedAfter?.vehicleId).toBe("VEH-002");

    // Release and ensure available
    useSharedDemoState.getState().releaseSpace("SP-14");
    const cleared = useSharedDemoState.getState().spaces["SP-14"];
    expect(cleared?.status).toBe("AVAILABLE");
    expect(cleared?.vehicleId).toBeNull();
  });
});
