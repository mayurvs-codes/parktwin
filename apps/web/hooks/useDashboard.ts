"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchActiveSessions,
  fetchEvents,
  fetchHealth,
  fetchOccupancy,
  fetchStatistics,
  fetchVehicles,
} from "@/services/dashboard";

/**
 * TanStack Query hooks for the Dashboard (Module 6 – Phase C).
 *
 * Each hook owns one gateway call and exposes the standard
 * loading/error/data tuple the panels render against. `staleTime` is inherited
 * from the shared query client (30s) — the dashboard is an operational overview,
 * not a real-time view, so periodic refetch is fine.
 */

export const dashboardKeys = {
  occupancy: ["dashboard", "occupancy"] as const,
  statistics: ["dashboard", "statistics"] as const,
  events: ["dashboard", "events"] as const,
  health: ["dashboard", "health"] as const,
  vehicles: ["dashboard", "vehicles"] as const,
  sessions: ["dashboard", "sessions"] as const,
};

export function useOccupancy() {
  return useQuery({ queryKey: dashboardKeys.occupancy, queryFn: fetchOccupancy });
}

export function useStatistics() {
  return useQuery({ queryKey: dashboardKeys.statistics, queryFn: fetchStatistics });
}

export function useEvents(limit = 50) {
  return useQuery({
    queryKey: [...dashboardKeys.events, limit],
    queryFn: () => fetchEvents(limit),
  });
}

export function useHealth() {
  return useQuery({ queryKey: dashboardKeys.health, queryFn: fetchHealth });
}

export function useVehicles(limit = 100) {
  return useQuery({
    queryKey: [...dashboardKeys.vehicles, limit],
    queryFn: () => fetchVehicles(limit),
  });
}

export function useActiveSessions(limit = 50) {
  return useQuery({
    queryKey: [...dashboardKeys.sessions, limit],
    queryFn: () => fetchActiveSessions(limit),
  });
}
