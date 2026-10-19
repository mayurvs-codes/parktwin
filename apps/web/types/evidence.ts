/**
 * ParkTwin AI — CCTV & ANPR Evidence Domain Types
 * ==================================================
 * Strongly typed definitions for real CCTV/ANPR pipeline outputs,
 * strictly separated from application decisions and demo scenarios.
 */

import type { DemoVehicleId } from "@/config/demoVehicles";

/** Raw detected plate record as output by the CV/ANPR pipeline */
export interface RawDetectedPlate {
  tracking_id: number;
  license_plate: string;
  plate_raw: string;
  plate_confidence: number;
  vehicle_type: string;
  brand: string;
  color: string;
  ocr_engine: string;
  frame_id: number;
  timestamp: string;
}

/** Full raw ANPR result payload produced by the backend / anpr_result.json */
export interface RawAnprResult {
  success: boolean;
  run_id: string;
  frames_processed: number;
  vehicles_detected: number;
  processing_time_ms: number;
  annotated_video_url?: string | null;
  csv_url?: string | null;
  json_url?: string | null;
  detected_plates: RawDetectedPlate[];
  error?: string | null;
}

/**
 * Normalized CCTV Vehicle Evidence
 * Represents facts directly observed and verified by the physical camera and AI models.
 */
export interface VehicleEvidence {
  evidenceId: string;
  sourceVideo: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  frameId: number;
  trackId: number;
  /** Plate number if successfully recognized by OCR; null if unreadable. NEVER FABRICATE. */
  plateNumber: string | null;
  plateRaw: string | null;
  plateConfidence: number | null;
  ocrEngine: string;
  vehicleType: string;
  brand: string;
  color: string;
  recognitionStatus: "recognized" | "unreadable";
  bbox?: [number, number, number, number];
}

/**
 * Configurable mapping layer between physical CCTV evidence and demo vehicle identifiers.
 * Prevents treating demo vehicle IDs (VEH-001..VEH-005) as physical ANPR identities.
 */
export interface EvidenceVehicleMapping {
  evidenceId: string;
  trackId: number;
  demoVehicleId: DemoVehicleId;
  notes?: string;
}
