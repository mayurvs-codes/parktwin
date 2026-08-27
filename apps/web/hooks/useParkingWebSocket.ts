"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getEnv } from "@/utils/env";
import { parkingKeys } from "./useLiveParking";

/**
 * Live real-time transport for Live Parking (Module 6 – Phase D).
 *
 * Connects to the **existing** backend WebSocket at `/integration/ws` (the
 * Integration Layer, see PROJECT_MEMORY.md §7). The backend broadcasts on the
 * `occupancy` / `sessions` / `events` / `vehicles` / `slots` channels whenever
 * parking state changes.
 *
 * Reconnects automatically with a capped backoff. The hook is a no-op on the
 * server (WebSocket is browser-only).
 */

/** Channels the backend broadcasts live updates on. */
export type ParkingWsChannel = "occupancy" | "sessions" | "events" | "vehicles" | "slots";

const DEFAULT_CHANNELS: ParkingWsChannel[] = ["occupancy", "sessions", "slots"];
const MAX_BACKOFF_MS = 15_000;

function wsBaseUrl(apiBase: string): string {
  // http(s)://host:port → ws(s)://host:port
  return apiBase.replace(/^http/, "ws");
}

export interface UseParkingWebSocketOptions {
  channels?: ParkingWsChannel[];
  /** Disable the socket entirely (e.g. when polling-only is desired). */
  enabled?: boolean;
  /** Optional camera ID filter for slot invalidation. */
  cameraId?: string;
}

export function useParkingWebSocket(
  options: UseParkingWebSocketOptions = {},
  cameraIdParam?: string
): void {
  const { channels = DEFAULT_CHANNELS, enabled = true, cameraId: optionCameraId } = options;
  const cameraId = optionCameraId ?? cameraIdParam;
  const queryClient = useQueryClient();
  const socketsRef = useRef<WebSocket[]>([]);
  const retryRef = useRef<number | null>(null);
  const backoffRef = useRef<number>(3_000);
  const closedRef = useRef<boolean>(false);

  const channelKey = channels.join(",");

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    closedRef.current = false;

    const connect = () => {
      if (closedRef.current) return;
      const base = wsBaseUrl(getEnv().apiBase);
      const created: WebSocket[] = [];
      for (const channel of channels) {
        const url = `${base}/integration/ws?channel=${encodeURIComponent(channel)}&token=dev_admin_token`;
        try {
          const ws = new WebSocket(url);
          ws.onopen = () => {
            // Reset backoff after a successful (re)connection.
            backoffRef.current = 3_000;
          };
          ws.onmessage = (event) => {
            if (channel === "slots") {
              try {
                const data = JSON.parse(event.data);
                const eventCameraId: string | undefined =
                  data.camera_id ?? data.payload?.camera_id;

                if (!cameraId) {
                  // Backward compat: if no cameraId provided, invalidate without filter
                  void queryClient.invalidateQueries({ queryKey: parkingKeys.slots() });
                } else if (eventCameraId && eventCameraId === cameraId) {
                  void queryClient.invalidateQueries({
                    queryKey: parkingKeys.slots(cameraId),
                  });
                }
              } catch {
                void queryClient.invalidateQueries({
                  queryKey: parkingKeys.slots(cameraId),
                });
              }
            } else {
              // Live nudge for other channels: pull the latest authoritative snapshot from REST.
              void queryClient.invalidateQueries({ queryKey: parkingKeys.slots(cameraId) });
              void queryClient.invalidateQueries({
                queryKey: parkingKeys.sessions(true, 200, cameraId),
              });
              void queryClient.invalidateQueries({ queryKey: parkingKeys.occupancy(cameraId) });
            }
          };
          ws.onerror = () => {
            ws.close();
          };
          ws.onclose = () => {
            if (closedRef.current) return;
            // Capped exponential backoff for automatic reconnection.
            retryRef.current = window.setTimeout(connect, backoffRef.current);
            backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
          };
          created.push(ws);
        } catch {
          // Connection construction failed; retry on next backoff tick.
        }
      }
      socketsRef.current = created;
    };

    connect();

    return () => {
      closedRef.current = true;
      if (retryRef.current !== null) {
        window.clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      for (const ws of socketsRef.current) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      socketsRef.current = [];
    };
    // `channelKey` and `cameraId` are the stable primitive dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channelKey, cameraId, queryClient]);
}
