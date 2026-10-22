"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEnv } from "@/utils/env";
import { formatClock } from "@/lib/format";
import { bayLabel } from "@/utils/bayLabel";

export interface ParkingEventItem {
  event_id: string;
  event_type: string;
  timestamp: string;
  camera_id?: string | null;
  payload?: {
    slot_id?: string;
    license_plate?: string;
    state?: string;
    session_id?: string;
    [key: string]: unknown;
  };
}

interface NotificationFeedProps {
  open: boolean;
  onClose: () => void;
  onEventReceived?: (event: ParkingEventItem) => void;
}

function wsBaseUrl(apiBase: string): string {
  return apiBase.replace(/^http/, "ws");
}

function getBadgeVariant(eventType: string) {
  switch (eventType) {
    case "VehicleParked":
    case "SlotOccupied":
    case "SessionStarted":
      return "success";
    case "VehicleExited":
    case "SlotReleased":
    case "SessionEnded":
      return "warning";
    case "SlotStateChanged":
      return "secondary";
    default:
      return "default";
  }
}

export function NotificationFeed({ open, onClose, onEventReceived }: NotificationFeedProps) {
  const [events, setEvents] = useState<ParkingEventItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const base = wsBaseUrl(getEnv().apiBase);
    const url = `${base}/integration/ws?channel=events`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (msgEvent) => {
        try {
          const raw = JSON.parse(msgEvent.data);
          // Backend may send { camera_id, events: [...] } or a single event item
          const newEvents: ParkingEventItem[] = Array.isArray(raw.events)
            ? raw.events
            : raw.event_type
            ? [raw]
            : [];

          if (newEvents.length > 0) {
            setEvents((prev) => {
              const combined = [...newEvents, ...prev];
              return combined.slice(0, 10);
            });
            if (onEventReceived) {
              for (const ev of newEvents) {
                onEventReceived(ev);
              }
            }
          }
        } catch {
          /* ignore non-JSON or heartbeat */
        }
      };
    } catch {
      /* Connection failed */
    }

    return () => {
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, [onEventReceived]);

  if (!open) return null;

  return (
    <div className="fixed top-16 right-4 z-50 w-80 sm:w-96 shadow-2xl transition-all animate-in fade-in slide-in-from-top-2 duration-200">
      <Card className="border-border/80 bg-card/98 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" aria-hidden />
            Live Event Feed
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 rounded-full"
            onClick={onClose}
            aria-label="Close notifications feed"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-2 max-h-[28rem] overflow-y-auto">
          <div
            role="log"
            aria-live="polite"
            aria-label="Live parking notifications log"
            className="space-y-2.5"
          >
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                <Activity className="h-6 w-6 mb-2 text-muted-foreground/50 animate-pulse" />
                Listening for live events...
              </div>
            ) : (
              events.map((ev, index) => {
                const timeStr = ev.timestamp
                  ? formatClock(new Date(ev.timestamp).getTime() / 1000)
                  : "";
                const slotId = ev.payload?.slot_id;
                const plate = ev.payload?.license_plate;
                const camera = ev.camera_id;

                return (
                  <div
                    key={ev.event_id || `${ev.event_type}-${index}`}
                    className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/40 p-2.5 text-xs transition-colors hover:bg-muted/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={getBadgeVariant(ev.event_type)}>
                        {ev.event_type}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {timeStr}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-muted-foreground">
                      {camera && <span>Camera: <strong className="text-foreground font-medium">{camera}</strong></span>}
                      {slotId && <span>Slot: <strong className="text-foreground font-medium">{bayLabel(slotId)}</strong></span>}
                      {plate && <span>Plate: <strong className="text-foreground font-medium">{plate}</strong></span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
