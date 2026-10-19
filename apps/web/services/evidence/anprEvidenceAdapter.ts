/**
 * ParkTwin AI — ANPR Evidence Adapter
 * =====================================
 * Converts raw CV/ANPR pipeline outputs into clean, normalized `VehicleEvidence`.
 *
 * Grounding Rule:
 * NEVER invent or fabricate license plates. If license_plate is UNREADABLE
 * or confidence is 0, plateNumber MUST be null.
 */

import type { RawAnprResult, RawDetectedPlate, VehicleEvidence } from "@/types/evidence";
import { GROUNDED_ANPR_RESULT } from "./anprEvidenceData";

export class AnprEvidenceAdapter {
  private defaultCameraId: string;
  private defaultCameraName: string;

  constructor(
    cameraId = "CAM-01",
    cameraName = "B2 Entrance Gate (CAM-01)"
  ) {
    this.defaultCameraId = cameraId;
    this.defaultCameraName = cameraName;
  }

  /**
   * Adapts a single raw plate detection into a normalized VehicleEvidence object.
   */
  public adaptDetectedPlate(
    plate: RawDetectedPlate,
    sourceVideo = "test_video.mp4"
  ): VehicleEvidence {
    const isReadable =
      Boolean(plate.license_plate) &&
      plate.license_plate.toUpperCase() !== "UNREADABLE" &&
      plate.plate_confidence > 0;

    return {
      evidenceId: `EVD-TRK-${String(plate.tracking_id).padStart(3, "0")}`,
      sourceVideo,
      cameraId: this.defaultCameraId,
      cameraName: this.defaultCameraName,
      timestamp: plate.timestamp,
      frameId: plate.frame_id,
      trackId: plate.tracking_id,
      plateNumber: isReadable ? plate.license_plate : null,
      plateRaw: isReadable ? plate.plate_raw || plate.license_plate : null,
      plateConfidence: isReadable ? plate.plate_confidence : null,
      ocrEngine: plate.ocr_engine,
      vehicleType: plate.vehicle_type,
      brand: plate.brand,
      color: plate.color,
      recognitionStatus: isReadable ? "recognized" : "unreadable",
    };
  }

  /**
   * Adapts a full raw ANPR result into an array of VehicleEvidence objects.
   */
  public adaptResult(rawResult: RawAnprResult): VehicleEvidence[] {
    const sourceVideo = rawResult.annotated_video_url ?? "test_video.mp4";
    return rawResult.detected_plates.map((p) => this.adaptDetectedPlate(p, sourceVideo));
  }

  /**
   * Loads the authoritative grounded evidence from static pipeline results.
   */
  public getGroundedEvidence(): VehicleEvidence[] {
    return this.adaptResult(GROUNDED_ANPR_RESULT);
  }
}

/** Global singleton adapter instance */
export const anprEvidenceAdapter = new AnprEvidenceAdapter();
