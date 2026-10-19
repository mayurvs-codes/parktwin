import { describe, it, expect } from "vitest";
import { anprEvidenceAdapter, AnprEvidenceAdapter } from "@/services/evidence/anprEvidenceAdapter";
import { GROUNDED_ANPR_RESULT } from "@/services/evidence/anprEvidenceData";

describe("ANPR Evidence Adapter", () => {
  it("should correctly parse the grounded pipeline output without errors", () => {
    const evidence = anprEvidenceAdapter.getGroundedEvidence();
    expect(evidence).toHaveLength(11);
    expect(evidence[0]?.evidenceId).toBe("EVD-TRK-001");
  });

  it("should extract real grounded plates with accurate confidence and OCR engine", () => {
    const evidence = anprEvidenceAdapter.getGroundedEvidence();

    // Track 6: KA04MN8049
    const trk6 = evidence.find((e) => e.trackId === 6);
    expect(trk6).toBeDefined();
    expect(trk6?.plateNumber).toBe("KA04MN8049");
    expect(trk6?.plateConfidence).toBe(0.98);
    expect(trk6?.ocrEngine).toBe("paddleocr");
    expect(trk6?.recognitionStatus).toBe("recognized");
    expect(trk6?.vehicleType).toBe("SUV");
    expect(trk6?.brand).toBe("Volkswagen");

    // Track 10: KA05BZ2700
    const trk10 = evidence.find((e) => e.trackId === 10);
    expect(trk10).toBeDefined();
    expect(trk10?.plateNumber).toBe("KA05BZ2700");
    expect(trk10?.plateConfidence).toBe(0.98);

    // Track 9: KA05NB6963
    const trk9 = evidence.find((e) => e.trackId === 9);
    expect(trk9).toBeDefined();
    expect(trk9?.plateNumber).toBe("KA05NB6963");
    expect(trk9?.plateConfidence).toBe(0.92);

    // Track 8: KA05RP4700
    const trk8 = evidence.find((e) => e.trackId === 8);
    expect(trk8).toBeDefined();
    expect(trk8?.plateNumber).toBe("KA05RP4700");
    expect(trk8?.plateConfidence).toBe(0.95);
  });

  it("should strictly NEVER fabricate plates for unreadable tracks", () => {
    const evidence = anprEvidenceAdapter.getGroundedEvidence();

    // Tracks 1 to 5 and 11 are unreadable in pipeline
    const unreadableTracks = [1, 2, 3, 4, 5, 11];
    for (const trackId of unreadableTracks) {
      const record = evidence.find((e) => e.trackId === trackId);
      expect(record).toBeDefined();
      expect(record?.plateNumber).toBeNull();
      expect(record?.plateConfidence).toBeNull();
      expect(record?.recognitionStatus).toBe("unreadable");
    }
  });

  it("should preserve camera grounding on physical entrance camera CAM-01", () => {
    const evidence = anprEvidenceAdapter.getGroundedEvidence();
    for (const e of evidence) {
      expect(e.cameraId).toBe("CAM-01");
      expect(e.cameraName).toContain("B2 Entrance Gate");
    }
  });

  it("should support custom camera grounding without forcing default if specified", () => {
    const customAdapter = new AnprEvidenceAdapter("CAM-02", "North Gate");
    const result = customAdapter.adaptResult(GROUNDED_ANPR_RESULT);
    expect(result[0]?.cameraId).toBe("CAM-02");
    expect(result[0]?.cameraName).toBe("North Gate");
  });
});
