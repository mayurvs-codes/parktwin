/**
 * ParkTwin AI — Voice Assistant Zustand Store (Phase 4)
 * =======================================================
 * Manages driver voice announcements, autoplay unlocking, audio volume/rate,
 * deduplication, and audible vs. on-screen text fallbacks.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultVoiceOutput, type VoiceMessagePayload, type VoiceOutput } from "../services/voice/VoiceOutput";

export type VoiceStatus = "enabled" | "blocked" | "unavailable" | "muted";

export interface VoiceLogEntry {
  message_id: string;
  event_id: string;
  kind: string;
  text: string;
  priority: number;
  vehicle_id?: string;
  source: string;
  timestamp: string;
  delivered: boolean;
  visualFallback: boolean;
}

interface VoiceState {
  status: VoiceStatus;
  isUnlocked: boolean;
  enabled: boolean;
  volume: number;
  rate: number;
  language: string;
  currentAnnouncement: VoiceMessagePayload | null;
  announcementLog: VoiceLogEntry[];
  seenEventIds: string[];

  // Actions
  enableVoice: () => Promise<boolean>;
  muteVoice: () => void;
  unmuteVoice: () => void;
  setVolume: (v: number) => void;
  setRate: (r: number) => void;
  receiveAnnouncement: (msg: VoiceMessagePayload, adapterOverride?: VoiceOutput) => Promise<boolean>;
  cancelAnnouncement: (messageId?: string, adapterOverride?: VoiceOutput) => void;
  testVoice: (adapterOverride?: VoiceOutput) => Promise<void>;
  clearLog: () => void;
  checkAvailability: (adapterOverride?: VoiceOutput) => void;
}

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set, get) => ({
      status: "blocked",
      isUnlocked: false,
      enabled: true,
      volume: 1.0,
      rate: 1.0,
      language: "en-US",
      currentAnnouncement: null,
      announcementLog: [],
      seenEventIds: [],

      checkAvailability: (adapterOverride) => {
        const adapter = adapterOverride || defaultVoiceOutput;
        if (!adapter.isAvailable()) {
          set({ status: "unavailable" });
        } else if (get().status === "unavailable") {
          set({ status: get().isUnlocked ? "enabled" : "blocked" });
        }
      },

      enableVoice: async () => {
        const adapter = defaultVoiceOutput;
        if (!adapter.isAvailable()) {
          set({ status: "unavailable" });
          return false;
        }

        const ok = await adapter.unlock();
        if (ok) {
          set({ status: "enabled", isUnlocked: true, enabled: true });
          return true;
        } else {
          set({ status: "blocked" });
          return false;
        }
      },

      muteVoice: () => {
        set({ status: "muted", enabled: false });
        defaultVoiceOutput.cancel();
      },

      unmuteVoice: () => {
        const isUnlocked = get().isUnlocked;
        set({
          status: isUnlocked ? "enabled" : "blocked",
          enabled: true,
        });
      },

      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
      setRate: (r) => set({ rate: Math.max(0.5, Math.min(2.0, r)) }),

      receiveAnnouncement: async (msg, adapterOverride) => {
        const adapter = adapterOverride || defaultVoiceOutput;
        const state = get();

        // Check deduplication by event_id
        if (state.seenEventIds.includes(msg.event_id)) {
          return false;
        }

        const newSeen = [...state.seenEventIds.slice(-99), msg.event_id];
        const isAvailable = adapter.isAvailable();
        const canSpeak = isAvailable && state.enabled && state.status === "enabled";

        let delivered = false;
        if (canSpeak) {
          delivered = await adapter.speak(msg, { volume: state.volume, rate: state.rate });
        }

        const logEntry: VoiceLogEntry = {
          message_id: msg.message_id,
          event_id: msg.event_id,
          kind: msg.kind,
          text: msg.text,
          priority: msg.priority,
          vehicle_id: msg.vehicle_id,
          source: msg.source || "live",
          timestamp: msg.ts || new Date().toISOString(),
          delivered,
          visualFallback: !delivered,
        };

        set({
          currentAnnouncement: msg,
          seenEventIds: newSeen,
          announcementLog: [...state.announcementLog.slice(-99), logEntry],
          status: !isAvailable ? "unavailable" : !state.isUnlocked ? "blocked" : state.status,
        });

        return delivered;
      },

      cancelAnnouncement: (messageId, adapterOverride) => {
        const adapter = adapterOverride || defaultVoiceOutput;
        adapter.cancel(messageId);
        const curr = get().currentAnnouncement;
        if (curr && (!messageId || curr.message_id === messageId)) {
          set({ currentAnnouncement: null });
        }
      },

      testVoice: async (adapterOverride) => {
        const msg: VoiceMessagePayload = {
          message_id: `VM-TEST-${Date.now()}`,
          event_id: `EV-TEST-${Date.now()}`,
          kind: "ASSIGNMENT",
          text: "ParkTwin voice assistant is active and operational.",
          priority: 50,
          source: "demo",
        };
        await get().receiveAnnouncement(msg, adapterOverride);
      },

      clearLog: () => set({ announcementLog: [], seenEventIds: [] }),
    }),
    {
      name: "parktwin-voice-settings",
      partialize: (state) => ({
        enabled: state.enabled,
        volume: state.volume,
        rate: state.rate,
        language: state.language,
      }),
    }
  )
);

if (typeof window !== "undefined") {
  (window as any).__useVoiceStore = useVoiceStore;
}
