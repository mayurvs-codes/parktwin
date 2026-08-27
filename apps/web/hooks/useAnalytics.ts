"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchAnalyticsDashboard,
  fetchOccupancyAnalytics,
  fetchTrafficAnalytics,
  fetchTrendsAnalytics,
  fetchUtilizationAnalytics,
  type AnalyticsQueryParams,
} from "@/services/analytics";

export const analyticsKeys = {
  dashboard: (params?: AnalyticsQueryParams) =>
    ["analytics", "dashboard", params?.start?.toISOString(), params?.end?.toISOString()] as const,
  occupancy: (store: boolean, params?: AnalyticsQueryParams) =>
    ["analytics", "occupancy", store, params?.start?.toISOString(), params?.end?.toISOString()] as const,
  traffic: (store: boolean, params?: AnalyticsQueryParams) =>
    ["analytics", "traffic", store, params?.start?.toISOString(), params?.end?.toISOString()] as const,
  utilization: (store: boolean, params?: AnalyticsQueryParams) =>
    ["analytics", "utilization", store, params?.start?.toISOString(), params?.end?.toISOString()] as const,
  trends: (historyLimit: number, params?: AnalyticsQueryParams) =>
    ["analytics", "trends", historyLimit, params?.start?.toISOString(), params?.end?.toISOString()] as const,
};

/** Primary hook — one call returns occupancy + traffic + utilization + trends. */
export function useAnalyticsDashboard(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(params),
    queryFn: () => fetchAnalyticsDashboard(params),
  });
}

export function useOccupancyAnalytics(store = true, params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.occupancy(store, params),
    queryFn: () => fetchOccupancyAnalytics(store, params),
  });
}

export function useTrafficAnalytics(store = true, params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.traffic(store, params),
    queryFn: () => fetchTrafficAnalytics(store, params),
  });
}

export function useUtilizationAnalytics(store = true, params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.utilization(store, params),
    queryFn: () => fetchUtilizationAnalytics(store, params),
  });
}

export function useTrendsAnalytics(historyLimit = 200, params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: analyticsKeys.trends(historyLimit, params),
    queryFn: () => fetchTrendsAnalytics(historyLimit, params),
  });
}
