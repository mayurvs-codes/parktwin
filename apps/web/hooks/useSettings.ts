"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHealthExtended, fetchPublicSettings } from "@/services/settings";

export const settingsKeys = {
  public: ["settings", "public"] as const,
  healthExtended: ["settings", "healthExtended"] as const,
};

/**
 * TanStack Query hook for system settings with a 5-minute staleTime.
 */
export function useSystemSettings() {
  return useQuery({
    queryKey: settingsKeys.public,
    queryFn: fetchPublicSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * TanStack Query hook for extended system health.
 */
export function useHealthExtended() {
  return useQuery({
    queryKey: settingsKeys.healthExtended,
    queryFn: fetchHealthExtended,
    staleTime: 60 * 1000, // 1 minute
  });
}
