/**
 * ParkTwin AI — Evidence to Demo Vehicle Mapping Layer
 * ======================================================
 * Explicit mapping between physical CCTV evidence and demo vehicle identifiers.
 * Guarantees that demo IDs (VEH-001..VEH-005) are never conflated with real ANPR identities.
 */

import type { DemoVehicleId } from "@/config/demoVehicles";
import type { EvidenceVehicleMapping, VehicleEvidence } from "@/types/evidence";

/** Default configurable mapping configuration based on grounded ANPR pipeline output */
export const DEFAULT_EVIDENCE_MAPPINGS: EvidenceVehicleMapping[] = [
  {
    evidenceId: "EVD-TRK-006",
    trackId: 6,
    demoVehicleId: "VEH-001",
    notes: "Real ANPR: KA04MN8049 (Volkswagen SUV, 98% PaddleOCR)",
  },
  {
    evidenceId: "EVD-TRK-010",
    trackId: 10,
    demoVehicleId: "VEH-002",
    notes: "Real ANPR: KA05BZ2700 (Toyota Van, 98% PaddleOCR)",
  },
  {
    evidenceId: "EVD-TRK-009",
    trackId: 9,
    demoVehicleId: "VEH-003",
    notes: "Real ANPR: KA05NB6963 (Kia Van, 92% PaddleOCR)",
  },
  {
    evidenceId: "EVD-TRK-008",
    trackId: 8,
    demoVehicleId: "VEH-004",
    notes: "Real ANPR: KA05RP4700 (Silver Motorcycle, 95% PaddleOCR)",
  },
  {
    evidenceId: "EVD-TRK-001",
    trackId: 1,
    demoVehicleId: "VEH-005",
    notes: "Real ANPR: Unreadable plate (Jeep SUV, Pending Real ANPR Link)",
  },
];

export class EvidenceVehicleMapper {
  private mappings: Map<DemoVehicleId, EvidenceVehicleMapping>;

  constructor(initialMappings = DEFAULT_EVIDENCE_MAPPINGS) {
    this.mappings = new Map();
    for (const m of initialMappings) {
      this.mappings.set(m.demoVehicleId, { ...m });
    }
  }

  public getAllMappings(): EvidenceVehicleMapping[] {
    return Array.from(this.mappings.values());
  }

  public getMappingForDemoVehicle(demoId: DemoVehicleId): EvidenceVehicleMapping | undefined {
    return this.mappings.get(demoId);
  }

  public getDemoVehicleIdForTrack(trackId: number): DemoVehicleId | undefined {
    for (const m of this.mappings.values()) {
      if (m.trackId === trackId) return m.demoVehicleId;
    }
    return undefined;
  }

  public getDemoVehicleIdForEvidence(evidenceId: string): DemoVehicleId | undefined {
    for (const m of this.mappings.values()) {
      if (m.evidenceId === evidenceId) return m.demoVehicleId;
    }
    return undefined;
  }

  public updateMapping(mapping: EvidenceVehicleMapping): void {
    this.mappings.set(mapping.demoVehicleId, { ...mapping });
  }

  public resetMappings(): void {
    this.mappings.clear();
    for (const m of DEFAULT_EVIDENCE_MAPPINGS) {
      this.mappings.set(m.demoVehicleId, { ...m });
    }
  }

  /**
   * Matches an evidence list to a demo vehicle using the active mapping.
   */
  public findEvidenceForVehicle(
    vehicleId: DemoVehicleId,
    evidenceList: VehicleEvidence[]
  ): VehicleEvidence | undefined {
    const mapping = this.mappings.get(vehicleId);
    if (!mapping) return undefined;
    return evidenceList.find(
      (e) => e.evidenceId === mapping.evidenceId || e.trackId === mapping.trackId
    );
  }
}

/** Global singleton mapper instance */
export const evidenceVehicleMapper = new EvidenceVehicleMapper();
