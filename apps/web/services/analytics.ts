import { apiGet } from "@/services/api-client";
import type {
  AnalyticsDashboardDTO,
  OccupancyAnalyticsDTO,
  TrafficAnalyticsDTO,
  TrendsDTO,
  UtilizationAnalyticsDTO,
} from "@/types/analytics";

export interface AnalyticsQueryParams {
  start?: Date;
  end?: Date;
}

function buildQueryParams(
  extra: Record<string, unknown> = {},
  range?: AnalyticsQueryParams
): Record<string, unknown> {
  const params: Record<string, unknown> = { ...extra };
  if (range?.start) {
    params.start = range.start.toISOString();
  }
  if (range?.end) {
    params.end = range.end.toISOString();
  }
  return params;
}

/** Combined analytics dashboard (occupancy + traffic + utilization + trends). */
export function fetchAnalyticsDashboard(
  params?: AnalyticsQueryParams
): Promise<AnalyticsDashboardDTO> {
  return apiGet<AnalyticsDashboardDTO>("/analytics/dashboard", {
    params: buildQueryParams({}, params),
  });
}

/** Current occupancy analytics only. */
export function fetchOccupancyAnalytics(
  store = true,
  params?: AnalyticsQueryParams
): Promise<OccupancyAnalyticsDTO> {
  return apiGet<OccupancyAnalyticsDTO>("/analytics/occupancy", {
    params: buildQueryParams({ store }, params),
  });
}

/** Traffic analytics only. */
export function fetchTrafficAnalytics(
  store = true,
  params?: AnalyticsQueryParams
): Promise<TrafficAnalyticsDTO> {
  return apiGet<TrafficAnalyticsDTO>("/analytics/traffic", {
    params: buildQueryParams({ store }, params),
  });
}

/** Utilization analytics only. */
export function fetchUtilizationAnalytics(
  store = true,
  params?: AnalyticsQueryParams
): Promise<UtilizationAnalyticsDTO> {
  return apiGet<UtilizationAnalyticsDTO>("/analytics/utilization", {
    params: buildQueryParams({ store }, params),
  });
}

/** Trends analytics (timelines + session/duration statistics). */
export function fetchTrendsAnalytics(
  historyLimit = 200,
  params?: AnalyticsQueryParams
): Promise<TrendsDTO> {
  return apiGet<TrendsDTO>("/analytics/trends", {
    params: buildQueryParams({ history_limit: historyLimit }, params),
  });
}
