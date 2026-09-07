import type {
  AnalyticsDashboardDTO,
  OccupancyAnalyticsDTO,
  TrafficAnalyticsDTO,
  UtilizationAnalyticsDTO,
  TrendsDTO,
  OccupancyTimelinePoint,
  TrafficTimelinePoint,
} from "@/types/analytics";
import {
  DEMO_30_VEHICLES,
  CANONICAL_60_SPACES,
} from "@/components/digital-twin/demoScenarioData";
import type {
  RuntimeSpaceState,
  RuntimeVehicleState,
} from "@/store/useDemoMovieStore";

function formatDurationHms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Fixed baseline anchor time: Today at 14:00 (2:00 PM) for presentation consistency
function getPresentationBaseDate(): Date {
  const d = new Date();
  d.setHours(14, 0, 0, 0);
  return d;
}

/**
 * Computes authoritative facility analytics strictly derived from the shared demo movie state.
 *
 * Rules:
 * - Total slots is always strictly 60.
 * - Occupied / available counts match Live Parking, Digital Twin, and Dashboard 1:1.
 * - Vehicle counts and dwell times reflect movie lifecycle (20 baseline + Type A entrants).
 * - Timeline snapshots record time progression up to currentTime.
 * - When movie is PAUSED, currentTime stops, freezing all numbers and timeline charts.
 * - When movie is RESET, currentTime is 0, returning to deterministic t=0 baseline.
 */
export function deriveMovieAnalytics(
  currentTime: number,
  spaces: RuntimeSpaceState[],
  vehicles: RuntimeVehicleState[]
): AnalyticsDashboardDTO {
  const baseDate = getPresentationBaseDate();
  const baseTimeMs = baseDate.getTime();

  // 1. Occupancy Metrics
  const totalSlots = CANONICAL_60_SPACES.length; // 60
  const occupiedSlots = spaces.filter((s) => s.isOccupied).length;
  const freeSlots = totalSlots - occupiedSlots;
  const occupancyPercentage = Number(((occupiedSlots / totalSlots) * 100).toFixed(1));

  // 2. Vehicle Counts & Traffic
  const typeAEntered = vehicles.filter((v) => v.isTypeA && v.state !== "UPCOMING").length;
  const typeAExited = vehicles.filter((v) => v.isTypeA && v.state === "EXITED").length;
  const totalEntries = 20 + typeAEntered;
  const totalExits = typeAExited;
  const activeVehicles = totalEntries - totalExits;

  // Hourly traffic distribution (peak at 14:00)
  const hourlyTraffic: Record<string, number> = {
    "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 1,
    "6": 3, "7": 7, "8": 11, "9": 14, "10": 10, "11": 12,
    "12": 15, "13": 13, "14": 12 + typeAEntered, "15": 9, "16": 6,
    "17": 5, "18": 4, "19": 2, "20": 1, "21": 1, "22": 0, "23": 0,
  };

  const trafficDTO: TrafficAnalyticsDTO = {
    vehicle_entries: totalEntries,
    vehicle_exits: totalExits,
    active_vehicles: activeVehicles,
    peak_hours: [12, 14],
    peak_hour: 14,
    peak_hour_entries: hourlyTraffic["14"] ?? 12,
    hourly_traffic: hourlyTraffic,
    daily_traffic: [
      { date: baseDate.toISOString().slice(0, 10), entries: totalEntries },
    ],
    vehicle_counts: {
      total: totalEntries,
      distinct: totalEntries,
      active: activeVehicles,
    },
    event_crosscheck: {
      entries: totalEntries,
      exits: totalExits,
    },
  };

  // 3. Utilization & Durations
  // Baseline dwell: 45 min (2700s) for Type B vehicles
  let totalDwellSeconds = 20 * 2700;
  let dwellCount = 20;

  vehicles.filter((v) => v.isTypeA && v.state !== "UPCOMING").forEach((v) => {
    const dwell = v.state === "EXITED"
      ? v.exitCompleteTime - v.entryTime
      : currentTime - v.entryTime;
    totalDwellSeconds += Math.max(10, Math.round(dwell * 60)); // 1s movie = 1 min facility time
    dwellCount++;
  });

  const avgDwellSeconds = Math.round(totalDwellSeconds / Math.max(1, dwellCount));
  const avgDurationStr = formatDurationHms(avgDwellSeconds);

  // Most and least used slots
  const mostUsedSlots = spaces
    .filter((s) => s.isOccupied)
    .slice(0, 8)
    .map((s) => ({ slot_id: s.name, usage_count: 1 }));

  const leastUsedSlots = spaces
    .filter((s) => !s.isOccupied)
    .slice(0, 5)
    .map((s) => ({ slot_id: s.name, usage_count: 0 }));

  const utilizationDTO: UtilizationAnalyticsDTO = {
    slot_utilization: Number((occupiedSlots / totalSlots).toFixed(3)),
    slot_utilization_percentage: occupancyPercentage,
    used_slots: occupiedSlots,
    total_slots: totalSlots,
    average_parking_duration_seconds: avgDwellSeconds,
    average_parking_duration: avgDurationStr,
    turnover_rate: Number((totalExits / totalSlots).toFixed(2)),
    most_used_slots: mostUsedSlots,
    least_used_slots: leastUsedSlots,
    statistics_crosscheck: {
      average_duration_seconds: avgDwellSeconds,
    },
  };

  const occupancyDTO: OccupancyAnalyticsDTO = {
    current_occupancy: occupiedSlots,
    occupancy_percentage: occupancyPercentage,
    free_slots: freeSlots,
    reserved_slots: 0,
    unknown_slots: 0,
    average_occupancy: occupiedSlots,
    average_occupancy_percentage: occupancyPercentage,
    total_slots: totalSlots,
    per_camera: {
      "CAM-01": { status: "ONLINE", role: "ENTRY", detections: totalEntries },
      "CAM-02": { status: "ONLINE", role: "PATH/PARKING", detections: occupiedSlots },
      "CAM-03": { status: "ONLINE", role: "PATH/PARKING", detections: Math.round(occupiedSlots * 0.5) },
      "CAM-16": { status: "ONLINE", role: "EXIT", detections: totalExits },
    },
  };

  // 4. Time Series Progression Up To currentTime
  // Samples every 15 movie seconds from t=0 to currentTime
  const sampleIntervalSec = 15;
  const sampleTimes: number[] = [];
  for (let t = 0; t <= currentTime; t += sampleIntervalSec) {
    sampleTimes.push(t);
  }
  if (currentTime > 0 && sampleTimes[sampleTimes.length - 1] !== currentTime) {
    sampleTimes.push(currentTime);
  }

  const occupancyTimeline: OccupancyTimelinePoint[] = sampleTimes.map((t) => {
    // Determine Type A vehicles parked at second t
    const typeAParkedAtT = DEMO_30_VEHICLES.filter(
      (v) => v.isTypeA && t >= v.parkTime && t < v.exitStartTime
    ).length;
    const occAtT = 20 + typeAParkedAtT;
    const occPctAtT = Number(((occAtT / totalSlots) * 100).toFixed(1));
    // Facility time timestamp: each movie second = 1 facility minute
    const pointTimestamp = new Date(baseTimeMs + Math.round(t * 60) * 1000).toISOString();

    return {
      timestamp: pointTimestamp,
      current_occupancy: occAtT,
      occupancy_percentage: occPctAtT,
      free_slots: totalSlots - occAtT,
      reserved_slots: 0,
    };
  });

  const trafficTimeline: TrafficTimelinePoint[] = sampleTimes.map((t) => {
    const entriesAtT = 20 + DEMO_30_VEHICLES.filter((v) => v.isTypeA && t >= v.entryTime).length;
    const exitsAtT = DEMO_30_VEHICLES.filter((v) => v.isTypeA && t >= v.exitCompleteTime).length;
    const pointTimestamp = new Date(baseTimeMs + Math.round(t * 60) * 1000).toISOString();

    return {
      timestamp: pointTimestamp,
      vehicle_entries: entriesAtT,
      vehicle_exits: exitsAtT,
      active_vehicles: entriesAtT - exitsAtT,
    };
  });

  // 5. Session and Duration Statistics
  const trendsDTO: TrendsDTO = {
    occupancy_timeline: occupancyTimeline,
    traffic_timeline: trafficTimeline,
    session_statistics: {
      total_sessions: totalEntries,
      active_sessions: activeVehicles,
      closed_sessions: totalExits,
      average_duration_seconds: avgDwellSeconds,
      average_duration: avgDurationStr,
      max_duration_seconds: 4500,
      max_duration: "01:15:00",
      module2_crosscheck: {
        active_sessions: activeVehicles,
        total_sessions: totalEntries,
        average_duration_seconds: avgDwellSeconds,
      },
    },
    duration_statistics: {
      count: totalEntries,
      min_seconds: 600,
      max_seconds: 4500,
      mean_seconds: avgDwellSeconds,
      median_seconds: 2700,
      p25_seconds: 1800,
      p75_seconds: 3300,
      p90_seconds: 3900,
      distribution: [
        { bucket_seconds: 900, bucket_label: "< 15 min", count: 1 + Math.min(typeAEntered, 2) },
        { bucket_seconds: 1800, bucket_label: "15 - 30 min", count: 4 + Math.min(typeAEntered, 3) },
        { bucket_seconds: 2700, bucket_label: "30 - 45 min", count: 9 },
        { bucket_seconds: 3600, bucket_label: "45 - 60 min", count: 5 },
        { bucket_seconds: 4500, bucket_label: "> 60 min", count: 1 + typeAExited },
      ],
    },
    generated_at: new Date().toISOString(),
  };

  return {
    occupancy: occupancyDTO,
    traffic: trafficDTO,
    utilization: utilizationDTO,
    trends: trendsDTO,
    generated_at: new Date().toISOString(),
  };
}
