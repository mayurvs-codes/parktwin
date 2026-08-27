import { create } from "zustand";
import type { SessionDTO, SlotDTO } from "@/types/parking";
import type { DigitalTwinStore, TwinSlotState, TwinSlotStatus } from "@/types/digitalTwin";

function toTwinStatus(slot: SlotDTO): TwinSlotStatus {
  if (slot.is_reserved) return "reserved";
  switch (slot.state) {
    case "free":
      return "free";
    case "occupied":
      return "occupied";
    case "reserved":
      return "reserved";
    case "unknown":
    default:
      return "unknown";
  }
}

function buildInitialSlots(): Record<string, TwinSlotState> {
  const nowIso = new Date().toISOString();
  const initial: Record<string, TwinSlotState> = {};
  for (let i = 1; i <= 10; i++) {
    const key = `P${String(i).padStart(2, "0")}`;
    initial[key] = {
      slot_id: key,
      zone: i <= 5 ? "A" : "B",
      camera_id: "camera_01",
      status: "free",
      license_plate: null,
      vehicle_type: null,
      occupied_since: null,
      duration_seconds: 0,
      last_updated: nowIso,
    };
  }
  return initial;
}

export const useDigitalTwinStore = create<DigitalTwinStore>()((set) => ({
  slots: buildInitialSlots(),
  selectedSlotId: null,
  viewMode: "2d",
  showHeatmap: false,
  isConnected: false,

  initializeSlots: (slots: SlotDTO[], sessions: SessionDTO[]) => {
    const activeBySlot = new Map<string, SessionDTO>();
    for (const session of sessions) {
      if (session.is_active && session.slot_id) {
        activeBySlot.set(session.slot_id.toUpperCase(), session);
      }
    }

    const nowIso = new Date().toISOString();
    const nextSlots: Record<string, TwinSlotState> = buildInitialSlots();

    for (const slot of slots) {
      if (!slot.slot_id) continue;
      const key = slot.slot_id.toUpperCase();
      const session = activeBySlot.get(key) ?? null;
      const computedStatus = session ? "occupied" : toTwinStatus(slot);

      // If already initialized as occupied, do not downgrade to free from duplicate camera rows
      if (nextSlots[key] && nextSlots[key].status === "occupied" && computedStatus === "free") {
        continue;
      }

      nextSlots[key] = {
        slot_id: key,
        zone: slot.zone || (["P01", "P02", "P03", "P04", "P05"].includes(key) ? "A" : "B"),
        camera_id: slot.camera_id || "camera_01",
        status: computedStatus,
        license_plate: session?.license_plate ?? null,
        vehicle_type: null,
        occupied_since: session?.entry_time ?? null,
        duration_seconds: session?.duration_seconds ?? 0,
        last_updated: nowIso,
      };
    }

    set({ slots: nextSlots });
  },

  updateSlot: (slotId: string, delta: Partial<TwinSlotState>) => {
    set((state) => {
      const key = slotId.toUpperCase();
      const existing = state.slots[key] || state.slots[slotId] || {
        slot_id: key,
        zone: ["P01", "P02", "P03", "P04", "P05"].includes(key) ? "A" : "B",
        camera_id: "camera_01",
        status: "free",
        license_plate: null,
        vehicle_type: null,
        occupied_since: null,
        duration_seconds: 0,
        last_updated: new Date().toISOString(),
      };
      return {
        slots: {
          ...state.slots,
          [key]: {
            ...existing,
            ...delta,
            slot_id: key,
            last_updated: delta.last_updated ?? new Date().toISOString(),
          },
        },
      };
    });
  },

  selectSlot: (slotId: string | null) => set({ selectedSlotId: slotId }),

  setViewMode: (mode: "2d" | "3d") => set({ viewMode: mode }),

  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),

  setConnected: (connected: boolean) => set({ isConnected: connected }),

  resetDigitalTwin: () =>
    set((state) => {
      const resetSlots: Record<string, TwinSlotState> = {};
      const baseSlots = Object.keys(state.slots).length > 0 ? state.slots : buildInitialSlots();
      for (const [id, slot] of Object.entries(baseSlots)) {
        resetSlots[id] = {
          ...slot,
          status: "free",
          license_plate: null,
          vehicle_type: null,
          occupied_since: null,
          duration_seconds: 0,
          last_updated: new Date().toISOString(),
        };
      }
      return {
        slots: resetSlots,
        selectedSlotId: null,
        viewMode: "2d",
        showHeatmap: false,
      };
    }),
}));
