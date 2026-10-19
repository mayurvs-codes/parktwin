/**
 * ParkTwin AI — Deterministic Evidence Timeline Replay Controller
 * =================================================================
 * Walks through real CCTV/ANPR pipeline evidence chronologically by frame_id
 * and timestamp, emitting normalized events into the shared domain state.
 *
 * Supported Actions:
 *  - Play, Pause, Next Event, Reset, Speed Selection (1x, 2x, 4x)
 */

import type { NormalizedParkingEvent } from "@/types/parkingEvents";
import type { VehicleEvidence } from "@/types/evidence";
import { anprEvidenceAdapter } from "./anprEvidenceAdapter";
import { evidenceVehicleMapper } from "./evidenceVehicleMapper";
import { eventNormalizer } from "./eventNormalizer";

export type ReplayStatus = "IDLE" | "PLAYING" | "PAUSED" | "COMPLETED";

export interface EvidenceTimelineStep {
  stepIndex: number;
  frameId: number;
  timestamp: string;
  evidence: VehicleEvidence;
  mappedDemoVehicleId?: string;
  description: string;
}

export type ReplayEventListener = (event: NormalizedParkingEvent, step: EvidenceTimelineStep) => void;

export class EvidenceReplayController {
  private timeline: EvidenceTimelineStep[] = [];
  private currentStepIndex = -1;
  private status: ReplayStatus = "IDLE";
  private speed = 1;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<ReplayEventListener> = new Set();

  constructor() {
    this.buildTimeline();
  }

  /**
   * Constructs the deterministic chronological timeline from grounded evidence.
   */
  public buildTimeline(): void {
    const allEvidence = anprEvidenceAdapter.getGroundedEvidence();
    // Sort strictly by frameId
    const sorted = [...allEvidence].sort((a, b) => a.frameId - b.frameId);

    this.timeline = sorted.map((evidence, idx) => {
      const demoId = evidenceVehicleMapper.getDemoVehicleIdForTrack(evidence.trackId);
      const isPlateReadable = Boolean(evidence.plateNumber);
      const desc = isPlateReadable
        ? `Frame ${evidence.frameId}: Track #${evidence.trackId} plate ${evidence.plateNumber} recognized (${evidence.ocrEngine})`
        : `Frame ${evidence.frameId}: Track #${evidence.trackId} vehicle detected (plate unreadable)`;

      return {
        stepIndex: idx,
        frameId: evidence.frameId,
        timestamp: evidence.timestamp,
        evidence,
        mappedDemoVehicleId: demoId,
        description: desc,
      };
    });
  }

  public getTimeline(): EvidenceTimelineStep[] {
    return this.timeline;
  }

  public getCurrentStep(): EvidenceTimelineStep | null {
    if (this.currentStepIndex >= 0 && this.currentStepIndex < this.timeline.length) {
      return this.timeline[this.currentStepIndex] ?? null;
    }
    return null;
  }

  public getStatus(): ReplayStatus {
    return this.status;
  }

  public getSpeed(): number {
    return this.speed;
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.5, Math.min(speed, 4));
  }

  public subscribe(listener: ReplayEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitStep(step: EvidenceTimelineStep): void {
    const demoId = step.mappedDemoVehicleId;
    const entryEvt = eventNormalizer.createEntryDetectedEvent(step.evidence, demoId);
    const plateEvt = eventNormalizer.createPlateRecognizedEvent(step.evidence, demoId);

    for (const listener of this.listeners) {
      listener(entryEvt, step);
      listener(plateEvt, step);
    }
  }

  /**
   * Advance one deterministic step along the evidence timeline.
   */
  public stepNext(): EvidenceTimelineStep | null {
    if (this.timeline.length === 0) return null;
    if (this.currentStepIndex < this.timeline.length - 1) {
      this.currentStepIndex += 1;
      const step = this.timeline[this.currentStepIndex]!;
      this.emitStep(step);
      if (this.currentStepIndex === this.timeline.length - 1) {
        this.status = "COMPLETED";
      }
      return step;
    }
    this.status = "COMPLETED";
    return null;
  }

  /**
   * Play continuously through the timeline at the configured playback speed.
   */
  public play(): void {
    if (this.status === "PLAYING") return;
    if (this.status === "COMPLETED" || this.currentStepIndex >= this.timeline.length - 1) {
      this.reset();
    }
    this.status = "PLAYING";
    this.scheduleNext();
  }

  private scheduleNext(): void {
    if (this.status !== "PLAYING") return;

    // Base interval is 1500ms divided by playback speed
    const intervalMs = Math.round(1500 / this.speed);
    this.timerId = setTimeout(() => {
      const nextStep = this.stepNext();
      if (nextStep && this.status === "PLAYING") {
        this.scheduleNext();
      } else {
        this.status = "COMPLETED";
      }
    }, intervalMs);
  }

  public pause(): void {
    this.status = "PAUSED";
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public reset(): void {
    this.pause();
    this.currentStepIndex = -1;
    this.status = "IDLE";
  }
}

/** Global singleton evidence replay controller */
export const evidenceReplayController = new EvidenceReplayController();
