"use client";

import { useEffect, useRef } from "react";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { getEnv } from "@/utils/env";

function wsBaseUrl(apiBase: string): string {
  return apiBase.replace(/^http/, "ws");
}

export function useDigitalTwinSocket(): void {
  const updateSlot = useDigitalTwinStore((state) => state.updateSlot);
  const setConnected = useDigitalTwinStore((state) => state.setConnected);

  const socketRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retriesRef = useRef<number>(0);
  const isClosedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    isClosedRef.current = false;

    const connect = () => {
      if (isClosedRef.current) return;

      const apiBase = getEnv().apiBase || "http://localhost:8000";
      const base = wsBaseUrl(apiBase);
      const url = `${base}/integration/ws?channel=events&token=dev_admin_token`;

      try {
        const ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onopen = () => {
          retriesRef.current = 0;
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const eventType = data.event_type || data.type;
            const payload = data.payload || data;
            const nowIso = new Date().toISOString();

            if (eventType === "DigitalTwinReset" || eventType === "DIGITAL_TWIN_RESET") {
              useDigitalTwinStore.getState().resetDigitalTwin();
              return;
            }

            if (eventType === "JourneyUpdated" || eventType === "JOURNEY_UPDATED") {
              const journeys = payload.journeys || data.journeys || [];
              if (Array.isArray(journeys)) {
                for (const j of journeys) {
                  if (j.parking_slot && j.status === "parked") {
                    updateSlot(j.parking_slot, {
                      status: "occupied",
                      license_plate: j.license_plate || null,
                      occupied_since: j.parked_at || j.entry_time || nowIso,
                      last_updated: nowIso,
                    });
                  } else if (j.parking_slot && j.status === "exited") {
                    updateSlot(j.parking_slot, {
                      status: "free",
                      license_plate: null,
                      occupied_since: null,
                      duration_seconds: j.duration_seconds || 0,
                      last_updated: nowIso,
                    });
                  }
                }
              }
              return;
            }

            if (!payload && !data) return;
            const slotId = data.slot_id || payload?.slot_id || payload?.slot;
            if (!slotId) return;

            switch (eventType) {
              case "VEHICLE_PARKED":
              case "SlotStateChanged":
              case "SLOT_STATE_CHANGED": {
                const rawState = data.state || payload?.state;
                const isOccupied = rawState === "occupied" || eventType === "VEHICLE_PARKED";
                const isReserved = rawState === "reserved";
                updateSlot(slotId, {
                  status: isOccupied ? "occupied" : isReserved ? "reserved" : "free",
                  license_plate: isOccupied ? (payload?.plate || payload?.license_plate || data.license_plate || null) : null,
                  occupied_since: isOccupied ? (payload?.time || payload?.timestamp || data.timestamp || nowIso) : null,
                  last_updated: nowIso,
                });
                break;
              }

              case "VEHICLE_DEPARTED":
                updateSlot(slotId, {
                  status: "free",
                  license_plate: null,
                  occupied_since: null,
                  duration_seconds:
                    payload?.session_duration_seconds ??
                    payload?.duration_seconds ??
                    data.duration_seconds ??
                    0,
                  last_updated: nowIso,
                });
                break;

              case "VIOLATION_DETECTED":
                updateSlot(slotId, {
                  status: "violation",
                  last_updated: nowIso,
                });
                break;

              default:
                break;
            }
          } catch {
            /* ignore invalid JSON */
          }
        };

        ws.onerror = () => {
          setConnected(false);
          try {
            ws.close();
          } catch {
            /* ignore */
          }
        };

        ws.onclose = () => {
          setConnected(false);
          if (isClosedRef.current) return;

          if (retriesRef.current < 5) {
            retriesRef.current += 1;
            retryTimerRef.current = window.setTimeout(connect, 3000);
          }
        };
      } catch {
        setConnected(false);
        if (!isClosedRef.current && retriesRef.current < 5) {
          retriesRef.current += 1;
          retryTimerRef.current = window.setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      isClosedRef.current = true;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          /* ignore */
        }
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [updateSlot, setConnected]);
}
