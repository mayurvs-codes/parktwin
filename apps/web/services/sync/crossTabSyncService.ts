/**
 * Cross-Tab Synchronization Service
 *
 * Facilitates real-time, low-latency cross-tab communication between
 * the User Portal (/user/...) and Admin Portal (/digital-twin)
 * using the W3C BroadcastChannel API with fallback to localStorage storage events.
 *
 * Ensures zero polling loops, zero manual page refreshes, and immunity to echo loops.
 */

import type { DemoVehicleId } from "@/config/demoVehicles";
import type { VehicleJourneyStep, UserParkingSession } from "@/store/useUserPortalStore";
import type { NormalizedParkingEvent } from "@/types/parkingEvents";

export type SyncActionType =
  | "SYNC_OCCUPANCY"
  | "SYNC_VEHICLE_JOURNEY"
  | "SYNC_EVIDENCE_STEP"
  | "SYNC_RESET"
  | "SYNC_TIMER"
  | "SYNC_SHARED_DEMO";

export interface OccupancyPayload {
  spaceId: string;
  isOccupied: boolean;
  vehicleId?: string | null;
  plate?: string | null;
  version?: number;
  timestamp: number;
}

export interface VehicleJourneyPayload {
  vehicleId: DemoVehicleId;
  journeyStep: VehicleJourneyStep;
  assignedSpaceId: string | null;
  vehiclePosition?: [number, number] | null;
  vehicleHeading?: number;
  sessionDurationSeconds?: number;
  activeSession?: UserParkingSession | null;
  version?: number;
  timestamp: number;
}

export interface EvidenceStepPayload {
  stepIndex: number;
  frameId: number;
  trackId: number;
  plateNumber: string | null;
  mappedVehicleId?: string;
  events: NormalizedParkingEvent[];
  timestamp: number;
}

export interface ResetPayload {
  source: "USER" | "ADMIN";
  mode?: "DEMO" | "EVIDENCE";
  timestamp: number;
}

export interface TimerPayload {
  vehicleId: DemoVehicleId;
  durationSeconds: number;
  timestamp: number;
}

export interface SharedDemoPayload {
  state: unknown;
  timestamp: number;
}

export interface VersionedSyncEvent<T = unknown> {
  eventId: string;
  type: SyncActionType;
  senderId: string;
  vehicleId?: string;
  slotId?: string;
  timestamp: number;
  version: number;
  payload: T;
}

export type CrossTabMessage =
  | (VersionedSyncEvent<OccupancyPayload> & { type: "SYNC_OCCUPANCY" })
  | (VersionedSyncEvent<VehicleJourneyPayload> & { type: "SYNC_VEHICLE_JOURNEY" })
  | (VersionedSyncEvent<EvidenceStepPayload> & { type: "SYNC_EVIDENCE_STEP" })
  | (VersionedSyncEvent<ResetPayload> & { type: "SYNC_RESET" })
  | (VersionedSyncEvent<TimerPayload> & { type: "SYNC_TIMER" })
  | (VersionedSyncEvent<SharedDemoPayload> & { type: "SYNC_SHARED_DEMO" });

export type SyncMessageHandler = (message: CrossTabMessage) => void;

const CHANNEL_NAME = "parktwin_domain_sync";
const STORAGE_KEY = "parktwin_sync_event";

class CrossTabSyncService {
  private senderId: string;
  private channel: BroadcastChannel | null = null;
  private handlers = new Set<SyncMessageHandler>();
  private isApplyingRemote = false;
  private seenEventIds = new Set<string>();
  private vehicleVersions = new Map<string, number>();
  private slotVersions = new Map<string, number>();

  constructor() {
    this.senderId =
      typeof window !== "undefined"
        ? `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        : "ssr_server";

    if (typeof window !== "undefined") {
      this.initChannel();
    }
  }

  private initChannel() {
    if (typeof window === "undefined") return;

    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (evt: MessageEvent<CrossTabMessage>) => {
          this.handleIncoming(evt.data);
        };
      } catch (err) {
        console.warn("[CrossTabSync] BroadcastChannel init failed, falling back to storage", err);
      }
    }

    // Fallback: window storage event
    window.addEventListener("storage", (evt: StorageEvent) => {
      if (evt.key === STORAGE_KEY && evt.newValue) {
        try {
          const parsed = JSON.parse(evt.newValue) as CrossTabMessage;
          this.handleIncoming(parsed);
        } catch {
          // Ignore invalid parse
        }
      }
    });
  }

  public handleIncoming(msg: CrossTabMessage) {
    if (!msg || !msg.senderId) return;
    if (msg.senderId === this.senderId) return; // Prevent echo / self-triggering

    // 1. Deduplication guard: ignore already processed events
    if (msg.eventId) {
      if (this.seenEventIds.has(msg.eventId)) {
        return;
      }
      this.seenEventIds.add(msg.eventId);
      if (this.seenEventIds.size > 1000) {
        // Keep cache bounded
        const oldest = Array.from(this.seenEventIds).slice(0, 500);
        oldest.forEach((id) => this.seenEventIds.delete(id));
      }
    }

    // 2. Anti-stale version guard for vehicles
    if (msg.vehicleId && typeof msg.version === "number") {
      const currentVersion = this.vehicleVersions.get(msg.vehicleId) ?? 0;
      if (msg.version < currentVersion) {
        // Discard stale update
        return;
      }
      this.vehicleVersions.set(msg.vehicleId, msg.version);
    }

    // 3. Anti-stale version guard for slots
    if (msg.slotId && typeof msg.version === "number") {
      const currentVersion = this.slotVersions.get(msg.slotId) ?? 0;
      if (msg.version < currentVersion) {
        // Discard stale update
        return;
      }
      this.slotVersions.set(msg.slotId, msg.version);
    }

    // 4. Global reset clears version tracking
    if (msg.type === "SYNC_RESET") {
      this.vehicleVersions.clear();
      this.slotVersions.clear();
    }

    this.isApplyingRemote = true;
    try {
      for (const handler of Array.from(this.handlers)) {
        try {
          handler(msg);
        } catch (err) {
          console.error("[CrossTabSync] Handler error:", err);
        }
      }
    } finally {
      this.isApplyingRemote = false;
    }
  }

  public getSenderId(): string {
    return this.senderId;
  }

  public isApplyingRemoteUpdate(): boolean {
    return this.isApplyingRemote;
  }

  public reset(): void {
    this.seenEventIds.clear();
    this.vehicleVersions.clear();
    this.slotVersions.clear();
  }

  public subscribe(handler: SyncMessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private send(message: CrossTabMessage) {
    if (typeof window === "undefined") return;

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn("[CrossTabSync] postMessage failed", err);
      }
    }

    // Also update localStorage as backup / cross-origin fallback
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
    } catch {
      // Ignore quota or disabled local storage
    }
  }

  public broadcastOccupancy(payload: Omit<OccupancyPayload, "timestamp"> & { version?: number }) {
    if (this.isApplyingRemote) return;
    const currentVersion = this.slotVersions.get(payload.spaceId) ?? 0;
    const version = payload.version ?? currentVersion + 1;
    this.slotVersions.set(payload.spaceId, version);

    const eventId = `evt_occ_${payload.spaceId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.seenEventIds.add(eventId);

    this.send({
      type: "SYNC_OCCUPANCY",
      senderId: this.senderId,
      eventId,
      vehicleId: payload.vehicleId ?? undefined,
      slotId: payload.spaceId,
      version,
      timestamp: Date.now(),
      payload: { ...payload, timestamp: Date.now() },
    });
  }

  public broadcastJourney(payload: Omit<VehicleJourneyPayload, "timestamp"> & { version?: number }) {
    if (this.isApplyingRemote) return;
    const currentVersion = this.vehicleVersions.get(payload.vehicleId) ?? 0;
    const version = payload.version ?? currentVersion + 1;
    this.vehicleVersions.set(payload.vehicleId, version);

    const eventId = `evt_jny_${payload.vehicleId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.seenEventIds.add(eventId);

    this.send({
      type: "SYNC_VEHICLE_JOURNEY",
      senderId: this.senderId,
      eventId,
      vehicleId: payload.vehicleId,
      slotId: payload.assignedSpaceId ?? undefined,
      version,
      timestamp: Date.now(),
      payload: { ...payload, timestamp: Date.now() },
    });
  }

  public broadcastEvidenceStep(payload: Omit<EvidenceStepPayload, "timestamp">) {
    if (this.isApplyingRemote) return;
    const eventId = `evt_evd_${payload.trackId}_${payload.frameId}_${Date.now()}`;
    this.seenEventIds.add(eventId);

    this.send({
      type: "SYNC_EVIDENCE_STEP",
      senderId: this.senderId,
      eventId,
      vehicleId: payload.mappedVehicleId,
      version: payload.stepIndex + 1,
      timestamp: Date.now(),
      payload: { ...payload, timestamp: Date.now() },
    });
  }

  public broadcastReset(source: "USER" | "ADMIN", mode?: "DEMO" | "EVIDENCE") {
    if (this.isApplyingRemote) return;
    this.vehicleVersions.clear();
    this.slotVersions.clear();
    const eventId = `evt_rst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.seenEventIds.add(eventId);

    this.send({
      type: "SYNC_RESET",
      senderId: this.senderId,
      eventId,
      version: 1,
      timestamp: Date.now(),
      payload: { source, mode, timestamp: Date.now() },
    });
  }

  public broadcastTimer(vehicleId: DemoVehicleId, durationSeconds: number) {
    if (this.isApplyingRemote) return;
    const eventId = `evt_tmr_${vehicleId}_${Date.now()}`;
    this.seenEventIds.add(eventId);

    this.send({
      type: "SYNC_TIMER",
      senderId: this.senderId,
      eventId,
      vehicleId,
      version: 1,
      timestamp: Date.now(),
      payload: { vehicleId, durationSeconds, timestamp: Date.now() },
    });
  }

  public broadcastSharedDemo(state: unknown) {
    if (this.isApplyingRemote) return;
    const eventId = `evt_demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.seenEventIds.add(eventId);

    this.send({
      type: "SYNC_SHARED_DEMO",
      senderId: this.senderId,
      eventId,
      version: 1,
      timestamp: Date.now(),
      payload: { state, timestamp: Date.now() },
    });
  }
}

export const crossTabSyncService = new CrossTabSyncService();
