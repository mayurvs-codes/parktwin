import type { SessionDTO, SlotDTO } from "@/types/parking";

export type TwinSlotStatus = "free" | "occupied" | "reserved" | "violation" | "unknown";

export interface TwinSlotState {
  slot_id: string;
  zone: string;
  camera_id: string;
  status: TwinSlotStatus;
  license_plate: string | null;
  vehicle_type: string | null;
  occupied_since: string | null;
  duration_seconds: number;
  last_updated: string;
}

export interface DigitalTwinStore {
  // O(1) lookup indexed by slot_id — NEVER replace entire object on event
  slots: Record<string, TwinSlotState>;
  selectedSlotId: string | null;
  viewMode: "2d" | "3d";
  showHeatmap: boolean;
  isConnected: boolean;

  // Actions
  initializeSlots: (slots: SlotDTO[], sessions: SessionDTO[]) => void;
  updateSlot: (slotId: string, delta: Partial<TwinSlotState>) => void;
  selectSlot: (slotId: string | null) => void;
  setViewMode: (mode: "2d" | "3d") => void;
  toggleHeatmap: () => void;
  setConnected: (connected: boolean) => void;
  resetDigitalTwin: () => void;
}
