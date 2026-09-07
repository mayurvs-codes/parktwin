import { http, HttpResponse } from "msw";

export const mockOccupancy = {
  total_slots: 50,
  free: 35,
  occupied: 10,
  reserved: 5,
  unknown: 0,
  occupancy_rate: 20.0,
  per_camera: { CAM_01: { total: 50, occupied: 10 } },
};

export const mockStatistics = {
  active_sessions: 10,
  total_sessions: 150,
  closed_sessions: 140,
  average_duration_seconds: 3600,
  average_duration: "01:00:00",
  max_duration_seconds: 14400,
  max_duration: "04:00:00",
  events: { ENTRY: 150, EXIT: 140 },
  total_events: 290,
  top_plates: [{ license_plate: "ABC-1234", visits: 12 }],
  violations: { OVERSTAY: 2 },
};

export const mockVehicles = [
  {
    id: "v1",
    prototype_id: "VH-001",
    license_plate: "ABC-1234",
    vehicle_type: "sedan",
    brand: "Toyota",
    model: "Camry",
    color: "black",
    tracking_id: 101,
    plate_confidence: 0.95,
    detection_confidence: 0.98,
    color_confidence: 0.9,
    is_registered: true,
    last_seen: "2026-07-28T12:00:00Z",
    created_at: "2026-07-28T10:00:00Z",
  },
  {
    id: "v2",
    prototype_id: "VH-002",
    license_plate: "XYZ-9876",
    vehicle_type: "suv",
    brand: "Honda",
    model: "CR-V",
    color: "white",
    tracking_id: 102,
    plate_confidence: 0.91,
    detection_confidence: 0.94,
    color_confidence: 0.88,
    is_registered: false,
    last_seen: "2026-07-28T12:05:00Z",
    created_at: "2026-07-28T11:00:00Z",
  },
];

export const mockSlots = [
  {
    id: "s1",
    slot_id: "A-01",
    camera_id: "CAM_01",
    zone: "A",
    state: "occupied",
    is_reserved: false,
    reserved_for: null,
    position: null,
    created_at: "2026-07-28T00:00:00Z",
    updated_at: "2026-07-28T12:00:00Z",
  },
  {
    id: "s2",
    slot_id: "A-02",
    camera_id: "CAM_01",
    zone: "A",
    state: "free",
    is_reserved: false,
    reserved_for: null,
    position: null,
    created_at: "2026-07-28T00:00:00Z",
    updated_at: "2026-07-28T12:00:00Z",
  },
];

export const mockSessions = [
  {
    session_uid: "sess-1",
    camera_id: "CAM_01",
    slot_id: "A-01",
    license_plate: "ABC-1234",
    tracking_id: 101,
    entry_time: "2026-07-28T10:00:00Z",
    exit_time: null,
    duration_seconds: 7200,
    is_active: true,
    violation_flags: [],
  },
];

export const mockHealth = {
  integration: "healthy",
  parking_engine_initialized: true,
  event_bus: "memory",
  event_counts: { vehicle_detected: 100 },
  websocket_subscribers: { occupancy: 1 },
  occupancy: mockOccupancy,
};

export const mockAnalyticsDashboard = {
  occupancy: {
    current_occupancy: 10,
    occupancy_percentage: 20.0,
    free_slots: 35,
    reserved_slots: 5,
    unknown_slots: 0,
    average_occupancy: 8,
    average_occupancy_percentage: 16.0,
    total_slots: 50,
    per_camera: {},
  },
  traffic: {
    vehicle_entries: 45,
    vehicle_exits: 35,
    active_vehicles: 10,
    peak_hours: [14],
    peak_hour: 14,
    peak_hour_entries: 12,
    hourly_traffic: { "14": 12 },
    daily_traffic: [{ date: "2026-07-28", entries: 45 }],
    vehicle_counts: { total: 45, distinct: 40, active: 10 },
    event_crosscheck: { entries: 45, exits: 35 },
  },
  utilization: {
    slot_utilization: 0.2,
    slot_utilization_percentage: 20.0,
    used_slots: 10,
    total_slots: 50,
    average_parking_duration_seconds: 3600,
    average_parking_duration: "01:00:00",
    turnover_rate: 0.9,
    most_used_slots: [{ slot_id: "A-01", usage_count: 5 }],
    least_used_slots: [{ slot_id: "A-02", usage_count: 1 }],
    statistics_crosscheck: { average_duration_seconds: 3600 },
  },
  trends: {
    occupancy_timeline: [
      {
        timestamp: "2026-07-28T10:00:00Z",
        current_occupancy: 10,
        occupancy_percentage: 20.0,
        free_slots: 35,
        reserved_slots: 5,
      },
    ],
    traffic_timeline: [
      {
        timestamp: "2026-07-28T10:00:00Z",
        vehicle_entries: 5,
        vehicle_exits: 2,
        active_vehicles: 3,
      },
    ],
    session_statistics: {
      total_sessions: 150,
      active_sessions: 10,
      closed_sessions: 140,
      average_duration_seconds: 3600,
      average_duration: "01:00:00",
      max_duration_seconds: 14400,
      max_duration: "04:00:00",
      module2_crosscheck: {
        active_sessions: 10,
        total_sessions: 150,
        average_duration_seconds: 3600,
      },
    },
    duration_statistics: {
      count: 140,
      min_seconds: 300,
      max_seconds: 14400,
      mean_seconds: 3600,
      median_seconds: 3000,
      p25_seconds: 1800,
      p75_seconds: 5400,
      p90_seconds: 7200,
      distribution: [
        { bucket_seconds: 1800, bucket_label: "0-30m", count: 40 },
      ],
    },
    generated_at: "2026-07-28T12:00:00Z",
  },
  generated_at: "2026-07-28T12:00:00Z",
};

export const mockReports = [
  {
    id: "rep-1",
    type: "parking_summary" as const,
    generated_at: "2026-07-28T12:00:00Z",
    status: "generated" as const,
    file_path: "/reports_output/rep-1.pdf",
    format: "pdf" as const,
  },
];

export const handlers = [
  http.get("*/integration/occupancy", () => HttpResponse.json(mockOccupancy)),
  http.get("*/integration/statistics", () => HttpResponse.json(mockStatistics)),
  http.get("*/integration/vehicles", () => HttpResponse.json(mockVehicles)),
  http.get("*/integration/slots", () => HttpResponse.json(mockSlots)),
  http.get("*/integration/sessions", () => HttpResponse.json(mockSessions)),
  http.get("*/integration/health", () => HttpResponse.json(mockHealth)),
  http.get("*/integration/events", () =>
    HttpResponse.json({ source: "integration", events: [] })
  ),
  http.get("*/analytics/dashboard", () => HttpResponse.json(mockAnalyticsDashboard)),
  http.get("*/analytics/occupancy", () => HttpResponse.json(mockAnalyticsDashboard.occupancy)),
  http.get("*/analytics/traffic", () => HttpResponse.json(mockAnalyticsDashboard.traffic)),
  http.get("*/analytics/utilization", () => HttpResponse.json(mockAnalyticsDashboard.utilization)),
  http.get("*/analytics/trends", () => HttpResponse.json(mockAnalyticsDashboard.trends)),
  http.get("*/reports/history", () => HttpResponse.json(mockReports)),
  http.get("*/reports", () => HttpResponse.json(mockReports)),

  // Non-integration endpoints used by PrototypeMondayView
  http.get("*/vehicles", () => HttpResponse.json(mockVehicles)),
  http.get("*/slots", () => HttpResponse.json(mockSlots)),
  http.get("*/sessions", () => HttpResponse.json(mockSessions)),
  http.get("*/events", () => HttpResponse.json([])),
  http.get("*/navigation/route", () => HttpResponse.json({
    source: "ENTRY_GATE",
    destination: "P02",
    distance_meters: 42.0,
    path: ["ENTRY_GATE", "MAIN_LANE", "JUNCTION_A", "AISLE_A", "P02"],
    waypoints: [
      { id: "ENTRY_GATE", name: "Entry Gate (CAM-01)", x: 360, y: 780 },
      { id: "MAIN_LANE", name: "Main Driving Lane", x: 360, y: 820 },
      { id: "JUNCTION_A", name: "Junction Row A", x: 520, y: 820 },
      { id: "AISLE_A", name: "Aisle Row A (CAM-02)", x: 760, y: 820 },
      { id: "P02", name: "Slot P02", x: 650, y: 720 }
    ],
    directions: [
      "Proceed straight past the Entry Boom Barrier",
      "Continue East along North Main Drive Aisle (30m)",
      "Turn left into Parking Stall P02 (Zone A)"
    ]
  })),
];
