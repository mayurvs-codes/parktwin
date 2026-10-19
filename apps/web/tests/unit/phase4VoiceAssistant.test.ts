import { describe, it, expect, beforeEach, vi } from "vitest";
import { useVoiceStore } from "../../store/useVoiceStore";
import type { VoiceOutput, VoiceMessagePayload } from "../../services/voice/VoiceOutput";

describe("Phase 4 — Frontend Voice Assistant & Store", () => {
  beforeEach(() => {
    useVoiceStore.setState({
      status: "enabled",
      isUnlocked: true,
      enabled: true,
      currentAnnouncement: null,
      announcementLog: [],
      seenEventIds: [],
    });
  });

  const sampleMsg: VoiceMessagePayload = {
    message_id: "VM-001",
    event_id: "EV-001",
    kind: "ASSIGNMENT",
    text: "Vehicle recognised. Your designated parking space is SP-07.",
    priority: 50,
    source: "demo",
  };

  it("speaks when VOICE_ANNOUNCEMENT arrives and voice is enabled", async () => {
    const mockSpeak = vi.fn().mockResolvedValue(true);
    const mockAdapter: VoiceOutput = {
      isAvailable: () => true,
      isUnlocked: () => true,
      unlock: vi.fn().mockResolvedValue(true),
      speak: mockSpeak,
      cancel: vi.fn(),
    };

    const delivered = await useVoiceStore.getState().receiveAnnouncement(sampleMsg, mockAdapter);
    expect(delivered).toBe(true);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(useVoiceStore.getState().currentAnnouncement?.text).toContain("SP-07");

    const log = useVoiceStore.getState().announcementLog;
    expect(log).toHaveLength(1);
    expect(log[0]!.delivered).toBe(true);
    expect(log[0]!.visualFallback).toBe(false);
  });

  it("ignores duplicate announcements with identical event_id", async () => {
    const mockSpeak = vi.fn().mockResolvedValue(true);
    const mockAdapter: VoiceOutput = {
      isAvailable: () => true,
      isUnlocked: () => true,
      unlock: vi.fn().mockResolvedValue(true),
      speak: mockSpeak,
      cancel: vi.fn(),
    };

    // First arrival
    await useVoiceStore.getState().receiveAnnouncement(sampleMsg, mockAdapter);
    expect(mockSpeak).toHaveBeenCalledTimes(1);

    // Second arrival with same event_id
    const duplicateDelivered = await useVoiceStore.getState().receiveAnnouncement(sampleMsg, mockAdapter);
    expect(duplicateDelivered).toBe(false);
    expect(mockSpeak).toHaveBeenCalledTimes(1); // not called again
    expect(useVoiceStore.getState().announcementLog).toHaveLength(1);
  });

  it("cancels pending announcement on VOICE_CANCEL", () => {
    const mockCancel = vi.fn();
    const mockAdapter: VoiceOutput = {
      isAvailable: () => true,
      isUnlocked: () => true,
      unlock: vi.fn().mockResolvedValue(true),
      speak: vi.fn().mockResolvedValue(true),
      cancel: mockCancel,
    };

    useVoiceStore.setState({ currentAnnouncement: sampleMsg });
    useVoiceStore.getState().cancelAnnouncement(sampleMsg.message_id, mockAdapter);

    expect(mockCancel).toHaveBeenCalledWith(sampleMsg.message_id);
    expect(useVoiceStore.getState().currentAnnouncement).toBeNull();
  });

  it("falls back to visible text when audio is blocked or speech is unavailable", async () => {
    // Set status to blocked (e.g. user hasn't clicked Enable Voice yet)
    useVoiceStore.setState({ status: "blocked", isUnlocked: false });

    const mockSpeak = vi.fn().mockResolvedValue(false);
    const mockAdapter: VoiceOutput = {
      isAvailable: () => true,
      isUnlocked: () => false,
      unlock: vi.fn().mockResolvedValue(false),
      speak: mockSpeak,
      cancel: vi.fn(),
    };

    const delivered = await useVoiceStore.getState().receiveAnnouncement(sampleMsg, mockAdapter);
    expect(delivered).toBe(false);
    expect(mockSpeak).not.toHaveBeenCalled();

    // Text MUST still be present for visual display!
    expect(useVoiceStore.getState().currentAnnouncement?.text).toContain("SP-07");
    const log = useVoiceStore.getState().announcementLog;
    expect(log).toHaveLength(1);
    expect(log[0]!.delivered).toBe(false);
    expect(log[0]!.visualFallback).toBe(true);
  });

});
