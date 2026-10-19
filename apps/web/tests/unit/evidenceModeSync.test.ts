import { describe, it, expect, beforeEach } from "vitest";
import { evidenceVehicleMapper } from "@/services/evidence/evidenceVehicleMapper";
import { evidenceReplayController } from "@/services/evidence/evidenceReplayController";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";

describe("Evidence Mode & Shared Domain Synchronization", () => {
  beforeEach(() => {
    evidenceVehicleMapper.resetMappings();
    evidenceReplayController.reset();
    useUserPortalStore.getState().resetDemo();
  });

  describe("Evidence Vehicle Mapper", () => {
    it("should map the 5 CCTV grounded evidence tracks to demo vehicle IDs", () => {
      expect(evidenceVehicleMapper.getDemoVehicleIdForTrack(6)).toBe("VEH-001");
      expect(evidenceVehicleMapper.getDemoVehicleIdForTrack(10)).toBe("VEH-002");
      expect(evidenceVehicleMapper.getDemoVehicleIdForTrack(9)).toBe("VEH-003");
      expect(evidenceVehicleMapper.getDemoVehicleIdForTrack(8)).toBe("VEH-004");
      expect(evidenceVehicleMapper.getDemoVehicleIdForTrack(1)).toBe("VEH-005");
    });

    it("should allow dynamic re-mapping without hardcoded assumptions", () => {
      evidenceVehicleMapper.updateMapping({
        evidenceId: "EVD-CUSTOM-999",
        trackId: 999,
        demoVehicleId: "VEH-001",
        notes: "Custom test mapping",
      });

      expect(evidenceVehicleMapper.getDemoVehicleIdForTrack(999)).toBe("VEH-001");
      expect(evidenceVehicleMapper.getDemoVehicleIdForEvidence("EVD-CUSTOM-999")).toBe("VEH-001");
    });
  });

  describe("Evidence Replay Controller", () => {
    it("should construct a deterministic timeline sorted by frame_id", () => {
      const timeline = evidenceReplayController.getTimeline();
      expect(timeline.length).toBeGreaterThan(0);

      // Verify strict monotonic ordering by frameId
      for (let i = 0; i < timeline.length - 1; i++) {
        const curr = timeline[i]!;
        const next = timeline[i + 1]!;
        expect(curr.frameId).toBeLessThanOrEqual(next.frameId);
      }
    });

    it("should advance step-by-step and emit normalized events to subscribers", () => {
      const emittedEvents: string[] = [];
      const unsub = evidenceReplayController.subscribe((event) => {
        emittedEvents.push(event.eventType);
      });

      const step1 = evidenceReplayController.stepNext();
      expect(step1).toBeDefined();
      expect(step1?.frameId).toBe(2); // First frame is Track 1
      expect(emittedEvents).toContain("ENTRY_DETECTED");

      unsub();
    });

    it("should reset deterministically to initial state", () => {
      evidenceReplayController.stepNext();
      evidenceReplayController.stepNext();
      expect(evidenceReplayController.getCurrentStep()?.stepIndex).toBe(1);

      evidenceReplayController.reset();
      expect(evidenceReplayController.getCurrentStep()).toBeNull();
      expect(evidenceReplayController.getStatus()).toBe("IDLE");
    });
  });

  describe("User Portal Store Dual-Mode Execution", () => {
    it("should default to DEMO mode and allow toggling to EVIDENCE mode", () => {
      const store = useUserPortalStore.getState();
      expect(store.executionMode).toBe("DEMO");

      store.setExecutionMode("EVIDENCE");
      expect(useUserPortalStore.getState().executionMode).toBe("EVIDENCE");

      store.setExecutionMode("DEMO");
      expect(useUserPortalStore.getState().executionMode).toBe("DEMO");
    });

    it("should advance through real evidence in EVIDENCE mode and sync with Demo Movie Store", () => {
      const store = useUserPortalStore.getState();
      store.setExecutionMode("EVIDENCE");

      const initialMovieEventsCount = useDemoMovieStore.getState().events.length;

      // Advance one evidence step
      const step = store.stepEvidenceReplay();
      expect(step).toBeDefined();

      const updatedStore = useUserPortalStore.getState();
      expect(updatedStore.evidenceStepIndex).toBe(0);
      expect(updatedStore.events.length).toBeGreaterThan(0);

      // Verify sync with useDemoMovieStore events
      const updatedMovieEvents = useDemoMovieStore.getState().events;
      expect(updatedMovieEvents.length).toBeGreaterThan(initialMovieEventsCount);
      expect(updatedMovieEvents[0]?.camera).toBe("CAM-01");
    });

    it("should reset evidence replay cleanly", () => {
      const store = useUserPortalStore.getState();
      store.setExecutionMode("EVIDENCE");
      store.stepEvidenceReplay();
      expect(useUserPortalStore.getState().evidenceStepIndex).toBe(0);

      store.resetEvidenceReplay();
      const resetStore = useUserPortalStore.getState();
      expect(resetStore.evidenceStepIndex).toBe(-1);
      expect(resetStore.events).toHaveLength(0);
      expect(resetStore.activeVehicleId).toBe("VEH-001");
    });

    it("should preserve existing deterministic DEMO mode functionality", () => {
      const store = useUserPortalStore.getState();
      store.setExecutionMode("DEMO");

      // Reserved vehicle VEH-001 starts at SPACE_ASSIGNED
      expect(store.journeyStep).toBe("SPACE_ASSIGNED");

      // Advance step
      store.stepNextEvent();
      expect(useUserPortalStore.getState().journeyStep).toBe("NAVIGATING_TO_SPACE");

      // Arrive and park
      store.arriveAtSpace();
      expect(useUserPortalStore.getState().journeyStep).toBe("PARKED");

      // Verify SP-07 marked occupied in shared twin
      const space = useDemoMovieStore.getState().spaces.find((s) => s.id === "SP-07");
      expect(space?.isOccupied).toBe(true);

      // Reset
      store.resetDemo();
      expect(useUserPortalStore.getState().journeyStep).toBe("SPACE_ASSIGNED");
    });
  });
});
