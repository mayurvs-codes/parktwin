import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import type { OccupancyDTO } from "@/types/dashboard";

export interface TwinSummaryBarProps {
  occupancy: OccupancyDTO | null;
  isLoading: boolean;
}

export function TwinSummaryBar({ occupancy, isLoading }: TwinSummaryBarProps) {
  const slots = useDigitalTwinStore((state) => state.slots);
  const cameras = useDigitalTwinStore((state) => state.cameras);
  const vehicles = useDigitalTwinStore((state) => state.vehicles);

  if (isLoading && Object.keys(slots).length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const slotList = Object.values(slots);
  const occupiedCount = slotList.filter((s) => s.status === "occupied").length;
  const freeCount = slotList.filter((s) => s.status === "free").length;
  const totalCount = slotList.length > 0 ? slotList.length : occupancy?.total_slots ?? 10;
  const rate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;
  const activeVehiclesCount = Object.keys(vehicles).length || occupiedCount;
  const onlineCamerasCount = Object.values(cameras).filter((c) => c.status === "online").length;

  const items = [
    { label: "Total Slots", value: totalCount, sub: "P01 - P10", color: "text-foreground" },
    { label: "Occupied", value: occupiedCount, sub: `${rate}% utilized`, color: "text-rose-500" },
    { label: "Available Free", value: freeCount, sub: "Ready for parking", color: "text-emerald-500" },
    { label: "Active Vehicles", value: activeVehiclesCount, sub: "Tracked in twin", color: "text-sky-500" },
    { label: "Active CCTV", value: `${onlineCamerasCount} / 3`, sub: "25 FPS synced", color: "text-purple-500" },
    { label: "Floor Level", value: "82.5 M", sub: "Architectural B2", color: "text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <Card key={item.label} className="border-border/60 bg-card/70 backdrop-blur-sm">
          <CardContent className="p-3">
            <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
            <p className={`text-2xl font-bold tracking-tight mt-0.5 font-mono ${item.color}`}>
              {item.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
