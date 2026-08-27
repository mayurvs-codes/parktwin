import { describe, expect, it } from "vitest";
import { buildSlotViews } from "@/hooks/useLiveParking";
import type { SessionDTO, SlotDTO } from "@/types/parking";

describe("hooks/useLiveParking.ts", () => {
  it("buildSlotViews joins slots and sessions correctly", () => {
    const slots: SlotDTO[] = [
      {
        id: "s1",
        slot_id: "A-01",
        camera_id: "CAM_01",
        zone: "A",
        state: "occupied",
        is_reserved: false,
        reserved_for: null,
        position: null,
        created_at: null,
        updated_at: null,
      },
      {
        id: "s2",
        slot_id: "A-02",
        camera_id: "CAM_01",
        zone: "A",
        state: "free",
        is_reserved: false,
        reserved_for: null,
        position: null,
        created_at: null,
        updated_at: null,
      },
    ];

    const sessions: SessionDTO[] = [
      {
        session_uid: "sess-1",
        camera_id: "CAM_01",
        slot_id: "A-01",
        license_plate: "ABC-1234",
        tracking_id: 101,
        entry_time: "2026-07-28T10:00:00Z",
        exit_time: null,
        duration_seconds: 3600,
        is_active: true,
        violation_flags: [],
      },
      {
        session_uid: "sess-old",
        camera_id: "CAM_01",
        slot_id: "A-02",
        license_plate: "OLD-9999",
        tracking_id: 99,
        entry_time: "2026-07-27T10:00:00Z",
        exit_time: "2026-07-27T11:00:00Z",
        duration_seconds: 3600,
        is_active: false, // inactive session should not be joined
        violation_flags: [],
      },
    ];

    const views = buildSlotViews(slots, sessions);

    expect(views).toHaveLength(2);

    const slot1View = views.find((v) => v.slot.slot_id === "A-01");
    expect(slot1View).toBeDefined();
    expect(slot1View?.status).toBe("occupied");
    expect(slot1View?.plate).toBe("ABC-1234");
    expect(slot1View?.session?.session_uid).toBe("sess-1");

    const slot2View = views.find((v) => v.slot.slot_id === "A-02");
    expect(slot2View).toBeDefined();
    expect(slot2View?.status).toBe("available");
    expect(slot2View?.plate).toBeNull();
    expect(slot2View?.session).toBeNull();
  });
});
