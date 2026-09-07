"use client";

import React from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import type { KpiItem } from "@/types/dashboard";

export function KpiCardGrid() {
  const spaces = useDemoMovieStore((s) => s.spaces);
  const vehicles = useDemoMovieStore((s) => s.vehicles);

  const totalSlots = spaces.length; // 60
  const occupiedSlots = spaces.filter((s) => s.isOccupied).length;
  const availableSlots = totalSlots - occupiedSlots;
  const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

  // Active sessions: currently entering, parked, staying, or exiting
  const activeSessions = vehicles.filter(
    (v) => v.state !== "UPCOMING" && v.state !== "EXITED"
  ).length;

  // Vehicles entered today: all vehicles that have arrived at or passed through the facility
  const vehiclesToday = vehicles.filter((v) => v.state !== "UPCOMING").length;

  const items: KpiItem[] = [
    {
      key: "total-slots",
      label: "Total Parking Slots",
      value: String(totalSlots),
      hint: "across 6 facility zones",
      icon: "slots",
      tone: "default",
    },
    {
      key: "occupied-slots",
      label: "Occupied Slots",
      value: String(occupiedSlots),
      hint: `${availableSlots} available (GREEN)`,
      icon: "occupied",
      tone: "warning",
    },
    {
      key: "available-slots",
      label: "Available Slots",
      value: String(availableSlots),
      hint: `${occupiedSlots} occupied (RED)`,
      icon: "available",
      tone: "success",
    },
    {
      key: "active-sessions",
      label: "Active Parking Sessions",
      value: String(activeSessions),
      hint: "live dwell tracking",
      icon: "sessions",
      tone: "default",
    },
    {
      key: "vehicles-today",
      label: "Today's Vehicles",
      value: String(vehiclesToday),
      hint: "verified vehicle arrivals",
      icon: "vehicles",
      tone: "default",
    },
    {
      key: "occupancy-rate",
      label: "Occupancy Percentage",
      value: `${occupancyRate.toFixed(1)}%`,
      hint: `${occupiedSlots} of ${totalSlots}`,
      icon: "percent",
      tone: occupancyRate >= 80 ? "destructive" : occupancyRate >= 50 ? "warning" : "success",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <KpiCard key={item.key} item={item} />
      ))}
    </div>
  );
}
