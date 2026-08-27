import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { OccupancyDTO } from "@/types/dashboard";

export interface TwinSummaryBarProps {
  occupancy: OccupancyDTO | null;
  isLoading: boolean;
}

export function TwinSummaryBar({ occupancy, isLoading }: TwinSummaryBarProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const total = occupancy?.total_slots ?? 0;
  const occupied = occupancy?.occupied ?? 0;
  const free = occupancy?.free ?? 0;
  const rate = occupancy ? Math.round((occupancy.occupancy_rate ?? 0) * 100) : 0;

  const items = [
    { label: "Total Slots", value: total, color: "text-foreground" },
    { label: "Occupied", value: occupied, color: "text-rose-500" },
    { label: "Free", value: free, color: "text-emerald-500" },
    { label: "Occupancy %", value: `${rate}%`, color: "text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            <p className={`text-2xl font-bold tracking-tight mt-1 ${item.color}`}>
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
