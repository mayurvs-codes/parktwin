"use client";

import { useEffect, useRef, useState } from "react";
import { fetchFrame } from "@/services/streams";

export interface StreamFrameState {
  frameUrl: string | null;
  fps: number;
  error: string | null;
}

/**
 * Hook that polls live stream JPEG frames at 100ms when isActive is true.
 * Manages URL.createObjectURL and revokes previous URLs to prevent memory leaks.
 */
export function useStreamFrame(cameraId: string, isActive: boolean): StreamFrameState {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const prevUrlRef = useRef<string | null>(null);
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!isActive || !cameraId) {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
      setFrameUrl(null);
      setFps(0);
      setError(null);
      return;
    }

    let isSubscribed = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const pollFrame = async () => {
      try {
        const blob = await fetchFrame(cameraId);
        if (!isSubscribed) return;

        const newUrl = URL.createObjectURL(blob);
        if (prevUrlRef.current) {
          URL.revokeObjectURL(prevUrlRef.current);
        }
        prevUrlRef.current = newUrl;
        setFrameUrl(newUrl);
        setError(null);

        // Compute rolling FPS over last 1 second
        const now = Date.now();
        frameTimesRef.current.push(now);
        frameTimesRef.current = frameTimesRef.current.filter((t) => now - t <= 1000);
        setFps(frameTimesRef.current.length);
      } catch (err: unknown) {
        if (!isSubscribed) return;
        const msg = err instanceof Error ? err.message : "Failed to fetch stream frame";
        setError(msg);
      } finally {
        if (isSubscribed) {
          timerId = setTimeout(pollFrame, 100);
        }
      }
    };

    pollFrame();

    return () => {
      isSubscribed = false;
      if (timerId) clearTimeout(timerId);
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
    };
  }, [cameraId, isActive]);

  return { frameUrl, fps, error };
}
