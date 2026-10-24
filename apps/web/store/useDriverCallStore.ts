import { create } from "zustand";

export interface DriverCall {
  id: string;
  from: string;
  text: string;
  startedAt: number;
  vehicleId: string;
}

interface DriverCallState {
  call: DriverCall | null;
  startCall: (call: Omit<DriverCall, "id" | "startedAt">) => void;
  endCall: () => void;
}

/** The "phone call" the driver gets when they park in the wrong bay (shown as a banner while it speaks). */
export const useDriverCallStore = create<DriverCallState>((set) => ({
  call: null,
  startCall: (call) => set({ call: { ...call, id: `CALL-${Date.now()}`, startedAt: Date.now() } }),
  endCall: () => set({ call: null }),
}));
