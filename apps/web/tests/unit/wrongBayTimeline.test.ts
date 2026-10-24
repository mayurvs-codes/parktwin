import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { useVoiceStore } from "@/store/useVoiceStore";
import { useDriverCallStore } from "@/store/useDriverCallStore";
import {
  simulateWrongBay,
  DRIVER_CALL_DELAY_MS,
  ADMIN_NOTIFY_AFTER_CALL_MS,
} from "@/utils/wrongBaySimulation";
import { assignmentVoiceText } from "@/utils/driverName";

const calls = () => useVoiceStore.getState().announcementLog.filter((e) => e.source === "local-demo");

describe("wrong-bay timeline: call after 2 s, admin notified 5 s later", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    useSharedDemoState.getState().resetAll();
    useSharedDemoState.getState().setActivePersona("USER_A");
    useVoiceStore.setState({ announcementLog: [], seenEventIds: [], suppressBackendWrongBayUntil: 0, status: "enabled", isUnlocked: true });
    useDriverCallStore.getState().endCall();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("calls the driver at 2 s and notifies the admin 5 s after the call", async () => {
    expect(simulateWrongBay()).toBe(true);
    expect(useSharedDemoState.getState().violation?.active).toBe(true);

    // Nothing spoken yet at 1.9 s.
    await vi.advanceTimersByTimeAsync(DRIVER_CALL_DELAY_MS - 100);
    expect(calls()).toHaveLength(0);

    // The call arrives at 2 s with the warning and directions to the driver's own bay.
    await vi.advanceTimersByTimeAsync(100);
    expect(calls()).toHaveLength(1);
    expect(calls()[0]?.text).toContain("Warning! This is not your designated parking space. Please move to space C7.");
    expect(useDriverCallStore.getState().call?.vehicleId).toBe("VEH-001");

    // Admin not notified until 5 s after the call.
    await vi.advanceTimersByTimeAsync(ADMIN_NOTIFY_AFTER_CALL_MS - 100);
    expect(useSharedDemoState.getState().violation?.adminAlertActive).toBeFalsy();

    await vi.advanceTimersByTimeAsync(100);
    const v = useSharedDemoState.getState().violation;
    expect(v?.adminAlertActive).toBe(true);
    expect(v?.notMoved).toBe(true);
    expect(v?.message).toContain("has not moved");
  });

  it("does not notify the admin if the car moves (violation cleared) before the 7 s mark", async () => {
    simulateWrongBay();
    await vi.advanceTimersByTimeAsync(DRIVER_CALL_DELAY_MS + 1000);
    expect(calls()).toHaveLength(1);

    useSharedDemoState.getState().clearViolation();
    await vi.advanceTimersByTimeAsync(ADMIN_NOTIFY_AFTER_CALL_MS + 1000);
    expect(useSharedDemoState.getState().violation).toBeNull();
  });

  it("does not call the driver at all if the violation is cleared within 2 s", async () => {
    simulateWrongBay();
    await vi.advanceTimersByTimeAsync(500);
    useSharedDemoState.getState().clearViolation();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls()).toHaveLength(0);
  });

  it("drops the backend's own immediate warning so the driver is called once", async () => {
    simulateWrongBay();
    const spoken = await useVoiceStore.getState().receiveAnnouncement({
      message_id: "VM-BACKEND-1",
      event_id: "EV-BACKEND-1",
      kind: "WRONG_BAY_WARNING",
      text: "Warning! This is not your designated parking space. Please move to space SP-07.",
      priority: 100,
      vehicle_id: "VEH-001",
      source: "demo",
    });
    expect(spoken).toBe(false);
    expect(useVoiceStore.getState().announcementLog.some((e) => e.event_id === "EV-BACKEND-1")).toBe(false);
  });

  it("works for User B and Guest with their own vehicle and bay", async () => {
    for (const [persona, vehicle] of [["USER_B", "VEH-002"], ["GUEST", "VEH-003"]] as const) {
      useSharedDemoState.getState().resetAll();
      useSharedDemoState.getState().setActivePersona(persona);
      useVoiceStore.setState({ announcementLog: [], seenEventIds: [], suppressBackendWrongBayUntil: 0 });

      expect(simulateWrongBay()).toBe(true);
      expect(useSharedDemoState.getState().violation?.vehicleId).toBe(vehicle);
      await vi.advanceTimersByTimeAsync(DRIVER_CALL_DELAY_MS + ADMIN_NOTIFY_AFTER_CALL_MS);
      expect(calls()).toHaveLength(1);
      expect(useSharedDemoState.getState().violation?.notMoved).toBe(true);
      useSharedDemoState.getState().clearViolation();
    }
  });
});

describe("assignment voice", () => {
  it("is one short line: verification, welcome by name, the place", () => {
    expect(assignmentVoiceText("VEH-001", "SP-07")).toBe("Verification successful. Welcome User A. Your place is SP-07.");
    expect(assignmentVoiceText("VEH-003", "SP-11")).toBe("Verification successful. Welcome Guest. Your place is SP-11.");
  });
});
