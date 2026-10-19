"use client";

import { useEffect, useRef } from "react";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { useVoiceStore } from "@/store/useVoiceStore";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { getEnv } from "@/utils/env";
import type { CameraRole, VehicleStatus } from "@/types/digitalTwin";

function wsBaseUrl(apiBase: string): string {
  return apiBase.replace(/^http/, "ws");
}

export function useDigitalTwinSocket(): void {
  const updateSlot = useDigitalTwinStore((state) => state.updateSlot);
  const updateVehicle = useDigitalTwinStore((state) => state.updateVehicle);
  const updateCameraRole = useDigitalTwinStore((state) => state.updateCameraRole);
  const setConnected = useDigitalTwinStore((state) => state.setConnected);

  const socketRef = useRef<WebSocket | null>(null);
  const slotsSocketRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retriesRef = useRef<number>(0);
  const isClosedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "test") return;
    isClosedRef.current = false;

    const connectEvents = () => {
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
            const rawType = (data.event_type || data.type || "").toString();
            const normalizedType = rawType.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
            const payload = data.payload || data;
            const nowIso = new Date().toISOString();

            if (normalizedType === "DIGITAL_TWIN_RESET") {
              useDigitalTwinStore.getState().resetDigitalTwin();
              return;
            }

            // Voice Announcements & Cancellations (Phase 4 / Task 2)
            if (normalizedType === "VOICE_ANNOUNCEMENT") {
              const voiceMsg = payload.voice_message || payload;
              if (voiceMsg && voiceMsg.text) {
                void useVoiceStore.getState().receiveAnnouncement(voiceMsg);
              }
              return;
            }

            if (normalizedType === "VOICE_CANCEL") {
              const msgId = payload.message_id || data.message_id;
              useVoiceStore.getState().cancelAnnouncement(msgId);
              return;
            }

            // Wrong-Bay Warning and Escalations (Phase 3 & 4)
            if (normalizedType === "WRONG_BAY_ENTRY_WARNING") {
              const actual = payload.actual_bay || data.slot_id;
              const assigned = payload.assigned_bay;
              const vehId = payload.vehicle_id || data.vehicle_id;
              const plate = payload.license_plate || data.license_plate;
              useSharedDemoState.setState((s: any) => ({
                violation: {
                  active: true,
                  vehicleId: vehId || "VEH-001",
                  plate: plate || "KA04MH1234",
                  designatedSpaceId: assigned || "SP-07",
                  actualSpaceId: actual || "SP-11",
                  severity: "HIGH",
                  message: payload.message || `Wrong bay warning: Vehicle entered ${actual}`,
                  detectedAt: new Date().toLocaleTimeString(),
                  timestamp: Date.now(),
                  adminAlertActive: false,
                  durationSeconds: payload.duration_seconds || 0,
                },
              }));
              return;
            }

            if (normalizedType === "WRONG_BAY_ESCALATED") {
              useSharedDemoState.setState((s: any) => ({
                violation: s.violation
                  ? {
                      ...s.violation,
                      adminAlertActive: true,
                      durationSeconds: payload.duration_seconds || 600,
                    }
                  : {
                      active: true,
                      vehicleId: payload.vehicle_id || "VEH-001",
                      plate: payload.license_plate || "KA04MH1234",
                      designatedSpaceId: payload.assigned_bay || "SP-07",
                      actualSpaceId: payload.actual_bay || "SP-11",
                      severity: "HIGH",
                      message: payload.message || "Wrong bay escalated: 10 minutes exceeded",
                      detectedAt: new Date().toLocaleTimeString(),
                      timestamp: Date.now(),
                      adminAlertActive: true,
                      durationSeconds: payload.duration_seconds || 600,
                    },
              }));
              return;
            }

            if (normalizedType === "WRONG_BAY_DURATION_WARNING") {
              useSharedDemoState.setState((s: any) => ({
                violation: s.violation
                  ? {
                      ...s.violation,
                      durationSeconds: payload.duration_seconds || 480,
                    }
                  : null,
              }));
              return;
            }


            // 1. Camera Designation
            if (normalizedType === "CAMERA_DESIGNATED") {
              const camId = data.camera_id || payload?.camera_id;
              const role = (data.role || payload?.role || "UNKNOWN").toUpperCase() as CameraRole;
              if (camId) {
                updateCameraRole(camId, role);
              }
              return;
            }

            // 2. Vehicle Events
            const vehicleId = data.prototype_id || data.vehicle_id || payload?.vehicle_id || payload?.prototype_id;
            const plate = data.license_plate || data.plate || payload?.license_plate || payload?.plate;
            const slotId = data.slot_id || payload?.slot_id;
            const cameraId = data.camera_id || payload?.camera_id;

            if (vehicleId || plate) {
              const targetKey = vehicleId || plate;
              let vStatus: VehicleStatus = "entering";
              if (normalizedType.includes("PARK")) {
                vStatus = "parked";
              } else if (normalizedType.includes("EXIT")) {
                vStatus = "exited";
              } else if (normalizedType.includes("MOVE") || normalizedType.includes("OBSERVE")) {
                vStatus = "moving";
              }

              updateVehicle(targetKey, {
                id: targetKey,
                prototype_id: vehicleId || targetKey,
                license_plate: plate || targetKey,
                status: vStatus,
                slot_id: slotId || undefined,
                camera_id: cameraId || undefined,
                last_seen: data.timestamp || nowIso,
              });
            }

            // 3. Slot Events
            if (slotId) {
              const slotKey = slotId.toUpperCase();
              if (
                normalizedType === "SLOT_OCCUPIED" ||
                normalizedType === "VEHICLE_PARKED" ||
                normalizedType === "PARKING_SESSION_STARTED" ||
                normalizedType === "SLOT_STATE_CHANGED" && (data.state === "occupied" || payload?.state === "occupied")
              ) {
                updateSlot(slotKey, {
                  status: "occupied",
                  license_plate: plate || null,
                  occupied_since: data.timestamp || payload?.timestamp || nowIso,
                  camera_id: cameraId || undefined,
                  last_updated: nowIso,
                });
              } else if (
                normalizedType === "SLOT_FREED" ||
                normalizedType === "VEHICLE_DEPARTED" ||
                normalizedType === "VEHICLE_EXITED" ||
                normalizedType === "PARKING_SESSION_ENDED" ||
                normalizedType === "SLOT_STATE_CHANGED" && (data.state === "free" || payload?.state === "free")
              ) {
                updateSlot(slotKey, {
                  status: "free",
                  license_plate: null,
                  occupied_since: null,
                  duration_seconds: payload?.duration_seconds ?? data.duration_seconds ?? 0,
                  last_updated: nowIso,
                });
              } else if (normalizedType === "VIOLATION_DETECTED") {
                updateSlot(slotKey, {
                  status: "violation",
                  last_updated: nowIso,
                });
              }
            }

            // 4. Multi-journey updates if present
            if (normalizedType === "JOURNEY_UPDATED") {
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
            }
          } catch {
            /* ignore malformed messages */
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
          if (retriesRef.current < 10) {
            retriesRef.current += 1;
            retryTimerRef.current = window.setTimeout(connectEvents, 2000);
          }
        };
      } catch {
        setConnected(false);
        if (!isClosedRef.current && retriesRef.current < 10) {
          retriesRef.current += 1;
          retryTimerRef.current = window.setTimeout(connectEvents, 2000);
        }
      }
    };

    // Also connect to the slots channel for per-slot updates
    const connectSlots = () => {
      if (isClosedRef.current) return;

      const apiBase = getEnv().apiBase || "http://localhost:8000";
      const base = wsBaseUrl(apiBase);
      const url = `${base}/integration/ws?channel=slots&token=dev_admin_token`;

      try {
        const ws = new WebSocket(url);
        slotsSocketRef.current = ws;

        ws.onopen = () => {
          console.log('[DigitalTwin] Slots WS connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const slotId = data.slot_id;
            if (!slotId) return;

            const slotKey = slotId.toUpperCase();
            const state = data.state || data.payload?.state;
            const licensePlate = data.license_plate || data.payload?.license_plate;
            const cameraId = data.camera_id || data.payload?.camera_id;
            const sessionId = data.session_id || data.payload?.session_id;
            const timestamp = data.timestamp || new Date().toISOString();

            if (state === "occupied") {
              updateSlot(slotKey, {
                status: "occupied",
                license_plate: licensePlate || null,
                occupied_since: timestamp,
                camera_id: cameraId,
                last_updated: timestamp,
              });
            } else if (state === "free") {
              updateSlot(slotKey, {
                status: "free",
                license_plate: null,
                occupied_since: null,
                duration_seconds: data.duration_seconds ?? data.payload?.duration_seconds ?? 0,
                last_updated: timestamp,
              });
            } else if (state === "violation") {
              updateSlot(slotKey, {
                status: "violation",
                last_updated: timestamp,
              });
            } else if (state === "reserved") {
              updateSlot(slotKey, {
                status: "reserved",
                last_updated: timestamp,
              });
            }
          } catch {
            /* ignore malformed messages */
          }
        };

        ws.onclose = () => {
          if (isClosedRef.current) return;
          console.log('[DigitalTwin] Slots WS disconnected, reconnecting...');
          window.setTimeout(connectSlots, 2000);
        };
      } catch {
        if (!isClosedRef.current) {
          window.setTimeout(connectSlots, 2000);
        }
      }
    };

    connectEvents();
    connectSlots();

    return () => {
      isClosedRef.current = true;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [updateSlot, updateVehicle, updateCameraRole, setConnected]);
}
