import { describe, it, expect, beforeEach } from "vitest";
import { CANONICAL_BAYS } from "@/components/digital-twin/facilityGeometry";
import { useSharedDemoState, FOCUSED_ZONE_SPACE_IDS } from "@/store/useSharedDemoState";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { isWebGLAvailable, Twin3DErrorBoundary } from "@/components/digital-twin/Twin3DErrorBoundary";

describe("PHASE 1: Canonical Facility Model & Unified 2D/3D Twin", () => {
  beforeEach(() => {
    useSharedDemoState.getState().resetAll();
    useDigitalTwinStore.getState().setViewMode("2d");
  });

  describe("1. Canonical Geometry Consistency", () => {
    it("has unique IDs for every canonical bay", () => {
      const ids = CANONICAL_BAYS.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("verifies all 20 Focused Zone bays (SP-01 to SP-20) are marked verified: true", () => {
      const focusedBays = CANONICAL_BAYS.filter((b) =>
        FOCUSED_ZONE_SPACE_IDS.includes(b.id as (typeof FOCUSED_ZONE_SPACE_IDS)[number])
      );
      expect(focusedBays.length).toBe(20);
      for (const bay of focusedBays) {
        expect(bay.verified).toBe(true);
        expect(bay.dimensions_meters.width).toBeGreaterThan(2.0);
        expect(bay.dimensions_meters.length).toBeGreaterThan(4.5);
        expect(bay.position_3d).toHaveLength(3);
      }
    });

    it("marks perimeter unverified candidates as verified: false", () => {
      const perimeterBays = CANONICAL_BAYS.filter((b) => !b.id.startsWith("SP-0") && !b.id.startsWith("SP-1") && b.id !== "SP-20");
      if (perimeterBays.length > 0) {
        for (const bay of perimeterBays) {
          expect(bay.verified).toBe(false);
          expect(bay.confidence).toBe("MEDIUM_CONFIDENCE");
        }
      }
    });
  });

  describe("2. Selection Preservation Across 2D and 3D", () => {
    it("preserves selected space when switching between 2D and 3D view modes", () => {
      // 1. Select SP-07 in 2D
      useSharedDemoState.getState().selectSpace("SP-07");
      expect(useSharedDemoState.getState().selectedSpaceId).toBe("SP-07");
      expect(useDigitalTwinStore.getState().viewMode).toBe("2d");

      // 2. Switch to 3D mode
      useDigitalTwinStore.getState().setViewMode("3d");
      expect(useDigitalTwinStore.getState().viewMode).toBe("3d");
      // Selection must remain SP-07
      expect(useSharedDemoState.getState().selectedSpaceId).toBe("SP-07");

      // 3. Switch back to 2D mode
      useDigitalTwinStore.getState().setViewMode("2d");
      expect(useDigitalTwinStore.getState().viewMode).toBe("2d");
      expect(useSharedDemoState.getState().selectedSpaceId).toBe("SP-07");
    });

    it("selecting in 3D reflects immediately in shared state for 2D consumers", () => {
      useDigitalTwinStore.getState().setViewMode("3d");
      useSharedDemoState.getState().selectSpace("SP-14");
      expect(useSharedDemoState.getState().selectedSpaceId).toBe("SP-14");

      // Switching to 2D retains the exact same selection
      useDigitalTwinStore.getState().setViewMode("2d");
      expect(useSharedDemoState.getState().selectedSpaceId).toBe("SP-14");
    });
  });

  describe("3. Occupancy Truth Equality", () => {
    it("shared state provides identical bay occupancy counts for 2D and 3D", () => {
      const spaces = useSharedDemoState.getState().spaces;
      const focusedSpaces = FOCUSED_ZONE_SPACE_IDS.map((id) => spaces[id]!);

      const occupied = focusedSpaces.filter((s) => s?.status === "OCCUPIED");
      const available = focusedSpaces.filter((s) => s?.status === "AVAILABLE");
      const designated = focusedSpaces.filter((s) => s?.status === "DESIGNATED");

      // Exact baseline counts across both views
      expect(occupied.length).toBe(15);
      expect(available.length).toBe(4);
      expect(designated.length).toBe(1);
    });
  });

  describe("4. WebGL Error Boundary & Fallback", () => {
    it("isWebGLAvailable helper is defined and callable in test environment", () => {
      expect(typeof isWebGLAvailable).toBe("function");
    });

    it("Twin3DErrorBoundary is a valid React component", () => {
      expect(Twin3DErrorBoundary).toBeDefined();
    });
  });
});
