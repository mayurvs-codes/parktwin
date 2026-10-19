/**
 * ParkTwin AI — Demo Vehicles Configuration Layer
 * =================================================
 * Enforces strict separation between:
 *  1. Real CCTV Vehicle Evidence (what came from the actual CCTV/ANPR pipeline)
 *  2. Demo Scenario Assignments (the demonstration behavior and reservation states)
 *
 * Grounding Rules:
 *  - Vehicle identities: exactly 5 demo vehicles (VEH-001 through VEH-005).
 *  - Real CCTV source: CAM-01 (B2 Entrance Gate at ACCESS_POINT_B2).
 *  - NEVER invent or hard-code fake license plates as detected evidence.
 *  - Real ANPR source: anpr_result.json (pipeline run fd3b28581430).
 *      VEH-001 -> Track #6: KA04MN8049 (PaddleOCR 98%, Volkswagen SUV)
 *      VEH-002 -> Track #10: KA05BZ2700 (PaddleOCR 98%, Toyota Van)
 *      VEH-003 -> Track #9: KA05NB6963 (PaddleOCR 92%, Kia Van)
 *      VEH-004 -> Track #8: KA05RP4700 (PaddleOCR 95%, Maruti Silver)
 *      VEH-005 -> Track #1: Unreadable plate (null, Pending Real ANPR Link)
 *  - Reservation states (Application decisions):
 *      VEH-001 -> Designated (SP-07, Zone B (Upper Island) · B2, Registered User A)
 *      VEH-002 -> Registered (No initial designation/reservation, Registered User B)
 *      VEH-003 -> No reservation (Recommended: SP-08, Zone A · B2)
 *      VEH-004 -> No reservation (Dynamic space selection)
 *      VEH-005 -> No reservation (Dynamic space selection)
 */

export interface CctvVehicleEvidence {
  vehicleId: string;
  source: "CCTV";
  evidenceId?: string;
  cameraId: string;
  cameraName: string;
  accessPoint: "ACCESS_POINT_B2";
  detectedAt: string; // Real CCTV timestamp
  recognitionStatus: "recognized" | "unreadable";
  anprStatus: "GROUNDED_CCTV_PIPELINE" | "UNREADABLE_PENDING_LINK";
  plate: string | null; // Real plate from ANPR; null if unreadable. NEVER FABRICATE.
  plateConfidence: number | null;
  ocrEngine: string;
  trackId?: number;
  frameId?: number;
  vehicleType: string;
}

export interface DemoScenarioConfig {
  vehicleId: string;
  hasReservation: boolean;
  assignedSpaceId: string | null;
  zone: string | null;
  level: "B2";
  reservationWindow: string | null;
  model: string;
  color: string;
  notes: string;
  defaultRecommendedSpaceId?: string | null;
}

export interface DemoVehicleDefinition {
  evidence: CctvVehicleEvidence;
  scenario: DemoScenarioConfig;
}

/**
 * Authoritative 5-Vehicle Demo Configuration
 * Mapped to actual ANPR pipeline detections from `anpr_result.json`.
 */
export const DEMO_VEHICLES: Record<string, DemoVehicleDefinition> = {
  "VEH-001": {
    evidence: {
      vehicleId: "VEH-001",
      evidenceId: "EVD-TRK-006",
      source: "CCTV",
      cameraId: "CAM-01",
      cameraName: "B2 Entrance Gate",
      accessPoint: "ACCESS_POINT_B2",
      detectedAt: "2026-08-31T11:20:44.444315+00:00",
      recognitionStatus: "recognized",
      anprStatus: "GROUNDED_CCTV_PIPELINE",
      plate: "KA04MN8049", // Real grounded plate from Track #6 in benchmark test_video.mp4; CAM-01 physical clip displays KA05ML7220
      plateConfidence: 0.98,
      ocrEngine: "paddleocr",
      trackId: 6,
      frameId: 57,
      vehicleType: "SUV (Volkswagen)",
    },
    scenario: {
      vehicleId: "VEH-001",
      hasReservation: true,
      assignedSpaceId: "SP-07",
      zone: "Zone B (Upper Island)",
      level: "B2",
      reservationWindow: "4:00 PM – 6:00 PM",
      model: "Executive SUV",
      color: "#ef4444", // Red
      notes: "Demo designated space: SP-07 (Zone B (Upper Island) · B2). ANPR benchmark plate: KA04MN8049 (Track #6). Registered User A.",
    },
  },
  "VEH-002": {
    evidence: {
      vehicleId: "VEH-002",
      evidenceId: "EVD-TRK-010",
      source: "CCTV",
      cameraId: "CAM-01",
      cameraName: "B2 Entrance Gate",
      accessPoint: "ACCESS_POINT_B2",
      detectedAt: "2026-08-31T11:28:08.752141+00:00",
      recognitionStatus: "recognized",
      anprStatus: "GROUNDED_CCTV_PIPELINE",
      plate: "KA05BZ2700", // Real grounded plate from Track #10
      plateConfidence: 0.98,
      ocrEngine: "paddleocr",
      trackId: 10,
      frameId: 126,
      vehicleType: "Van (Toyota)",
    },
    scenario: {
      vehicleId: "VEH-002",
      hasReservation: false,
      assignedSpaceId: null,
      zone: null,
      level: "B2",
      reservationWindow: null,
      model: "Compact Hybrid",
      color: "#10b981", // Green
      notes: "Registered User B: valid registration, no initial designation or reservation. Eligible to reserve SP-14.",
      defaultRecommendedSpaceId: "SP-14",
    },
  },
  "VEH-003": {
    evidence: {
      vehicleId: "VEH-003",
      evidenceId: "EVD-TRK-009",
      source: "CCTV",
      cameraId: "CAM-01",
      cameraName: "B2 Entrance Gate",
      accessPoint: "ACCESS_POINT_B2",
      detectedAt: "2026-08-31T11:26:30.103413+00:00",
      recognitionStatus: "recognized",
      anprStatus: "GROUNDED_CCTV_PIPELINE",
      plate: "KA05NB6963", // Real grounded plate from Track #9
      plateConfidence: 0.92,
      ocrEngine: "paddleocr",
      trackId: 9,
      frameId: 101,
      vehicleType: "Van (Kia)",
    },
    scenario: {
      vehicleId: "VEH-003",
      hasReservation: false,
      assignedSpaceId: null,
      zone: null,
      level: "B2",
      reservationWindow: null,
      model: "Electric Sedan",
      color: "#ef4444", // Red
      notes: "No reservation found. Drive-in parking.",
      defaultRecommendedSpaceId: "SP-08",
    },
  },
  "VEH-004": {
    evidence: {
      vehicleId: "VEH-004",
      evidenceId: "EVD-TRK-008",
      source: "CCTV",
      cameraId: "CAM-01",
      cameraName: "B2 Entrance Gate",
      accessPoint: "ACCESS_POINT_B2",
      detectedAt: "2026-08-31T11:25:17.584407+00:00",
      recognitionStatus: "recognized",
      anprStatus: "GROUNDED_CCTV_PIPELINE",
      plate: "KA05RP4700", // Real grounded plate from Track #8
      plateConfidence: 0.95,
      ocrEngine: "paddleocr",
      trackId: 8,
      frameId: 81,
      vehicleType: "Motorcycle (Maruti Suzuki)",
    },
    scenario: {
      vehicleId: "VEH-004",
      hasReservation: false,
      assignedSpaceId: null,
      zone: null,
      level: "B2",
      reservationWindow: null,
      model: "Crossover",
      color: "#10b981", // Green
      notes: "No reservation found. Dynamic bay allocation.",
      defaultRecommendedSpaceId: "SP-17",
    },
  },
  "VEH-005": {
    evidence: {
      vehicleId: "VEH-005",
      evidenceId: "EVD-TRK-001",
      source: "CCTV",
      cameraId: "CAM-01",
      cameraName: "B2 Entrance Gate",
      accessPoint: "ACCESS_POINT_B2",
      detectedAt: "2026-08-31T11:13:57.062373+00:00",
      recognitionStatus: "unreadable",
      anprStatus: "UNREADABLE_PENDING_LINK",
      plate: null, // UNREADABLE in pipeline -> NEVER FABRICATE
      plateConfidence: null,
      ocrEngine: "none",
      trackId: 1,
      frameId: 2,
      vehicleType: "SUV (Jeep)",
    },
    scenario: {
      vehicleId: "VEH-005",
      hasReservation: false,
      assignedSpaceId: null,
      zone: null,
      level: "B2",
      reservationWindow: null,
      model: "City Hatchback",
      color: "#ef4444", // Red
      notes: "No reservation found. Dynamic bay allocation.",
      defaultRecommendedSpaceId: "SP-31",
    },
  },
};

export type DemoVehicleId = "VEH-001" | "VEH-002" | "VEH-003" | "VEH-004" | "VEH-005";

export const DEMO_VEHICLE_IDS: DemoVehicleId[] = [
  "VEH-001",
  "VEH-002",
  "VEH-003",
  "VEH-004",
  "VEH-005",
];

export function getDemoVehicle(id: string): DemoVehicleDefinition | undefined {
  return DEMO_VEHICLES[id];
}
