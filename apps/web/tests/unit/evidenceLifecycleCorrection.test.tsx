import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { CctvEvidenceViewer } from "@/components/evidence/CctvEvidenceViewer";
import { UserDashboardView } from "@/components/user/UserDashboardView";
import { TwinIntelligenceRail } from "@/components/digital-twin/TwinIntelligenceRail";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";

describe("Evidence Lifecycle and Provenance Correction Tests", () => {
  beforeEach(() => {
    useUserPortalStore.getState().resetDemo();
    useDemoMovieStore.getState().resetMovie();
  });

  describe("Test A: CAM-02 Bay Evidence Transparency", () => {
    it("explicitly declares parking maneuver NOT OBSERVED and does not claim CCTV proves dynamic parking", () => {
      render(<CctvEvidenceViewer initialCamera="CAM-02" />);

      const breakdown = screen.getByTestId("evidence-status-breakdown");
      expect(breakdown).toBeInTheDocument();

      expect(screen.getAllByText(/Parking maneuver: NOT OBSERVED/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/KA05ND1565/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/KA03NY0035/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("PARTIAL — DOES NOT PROVE COMPLETE VEHICLE LIFECYCLE")).toBeInTheDocument();
      expect(screen.getByText(/Active demo vehicle bay assignments/i)).toBeInTheDocument();
    });
  });

  describe("Test B: CAM-03 Exit Evidence Transparency", () => {
    it("explicitly declares vehicle egress NOT OBSERVED IN SOURCE CLIP and attributes exit to APP_DECISION", () => {
      render(<CctvEvidenceViewer initialCamera="CAM-03" />);

      const breakdown = screen.getByTestId("evidence-status-breakdown");
      expect(breakdown).toBeInTheDocument();

      expect(screen.getAllByText(/Vehicle egress: NOT OBSERVED IN SOURCE CLIP/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Application exit event: APP_DECISION/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("EXIT RECORDED — CCTV PROOF NOT AVAILABLE IN SOURCE CLIP")).toBeInTheDocument();
    });
  });

  describe("Test C: CAM-01 Entrance Evidence and Provenance Linkage", () => {
    it("maintains IDENTITY LINKAGE: UNVERIFIED between physical KA05ML7220 and benchmark KA04MN8049", () => {
      render(<CctvEvidenceViewer initialCamera="CAM-01" />);

      const breakdown = screen.getByTestId("evidence-status-breakdown");
      expect(breakdown).toBeInTheDocument();

      expect(screen.getByText(/License plate visually legible on bumper: KA05ML7220/i)).toBeInTheDocument();
      expect(screen.getByText(/Machine ANPR Track #6: KA04MN8049/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Identity linkage: UNVERIFIED/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("PARTIAL — DOES NOT PROVE COMPLETE VEHICLE LIFECYCLE")).toBeInTheDocument();
    });
  });

  describe("Test D: Vehicle Journey Provenance Separation", () => {
    it("displays PARTIALLY EVIDENCE-BACKED badge for VEH-001 and separates Application Journey from Physical Evidence", () => {
      useUserPortalStore.getState().selectVehicle("VEH-001");
      render(<UserDashboardView />);

      const journeyCard = screen.getByTestId("vehicle-journey-provenance");
      expect(journeyCard).toBeInTheDocument();

      expect(screen.getByText("● PARTIALLY EVIDENCE-BACKED")).toBeInTheDocument();
      expect(screen.getByText("APPLICATION JOURNEY (SOFTWARE)")).toBeInTheDocument();
      expect(screen.getByText("PHYSICAL EVIDENCE (SENSORS)")).toBeInTheDocument();

      expect(screen.getByText("1. GATEWAY ENTRY")).toBeInTheDocument();
      expect(screen.getByText("2. NAVIGATION ROUTING")).toBeInTheDocument();
      expect(screen.getByText("3. BAY OCCUPANCY")).toBeInTheDocument();
      expect(screen.getByText("4. FACILITY EXIT")).toBeInTheDocument();

      expect(screen.getByText("2. PARKING MANEUVER (CAM-02)")).toBeInTheDocument();
      expect(screen.getByText("3. PHYSICAL EXIT (CAM-03)")).toBeInTheDocument();
      expect(screen.getByText("4. COMPLETE LIFECYCLE PROOF")).toBeInTheDocument();
    });

    it("displays APPLICATION-ONLY badge for vehicles without camera linkages (VEH-002 to VEH-005)", () => {
      useUserPortalStore.getState().selectVehicle("VEH-002");
      render(<UserDashboardView />);

      expect(screen.getByText("● APPLICATION-ONLY")).toBeInTheDocument();
    });
  });

  describe("Test E: Timeline Demarcation: EVIDENCE TIMELINE vs APPLICATION TIMELINE", () => {
    it("renders dual timelines with explicit provenance tags in Admin TwinIntelligenceRail", () => {
      render(<TwinIntelligenceRail />);

      const activityFeed = screen.getByTestId("twin-activity-feed");
      expect(activityFeed).toBeInTheDocument();

      expect(screen.getByText("EVIDENCE TIMELINE")).toBeInTheDocument();
      expect(screen.getByText("APPLICATION TIMELINE")).toBeInTheDocument();

      expect(screen.getByText("● EVIDENCE TIMELINE (CCTV / SENSORS)")).toBeInTheDocument();
      expect(screen.getByText("CAM-01 (B2 Gate)")).toBeInTheDocument();
      expect(screen.getByText("Track #6 (PaddleOCR)")).toBeInTheDocument();

      expect(screen.getByText("● EVIDENCE COVERAGE SUMMARY:")).toBeInTheDocument();
      expect(screen.getByText("Entry: PARTIAL | Maneuver: NOT PROVEN | Exit: NOT OBSERVED")).toBeInTheDocument();
    });
  });

  describe("Test F: Admin Evidence Coverage Summary Card", () => {
    it("declares exact CCTV/ANPR source counts and honest availability limits", () => {
      render(<TwinIntelligenceRail />);

      const coverageCard = screen.getByTestId("evidence-coverage-card");
      expect(coverageCard).toBeInTheDocument();

      expect(screen.getByText("3 (CAM-01, CAM-02, CAM-03)")).toBeInTheDocument();
      expect(screen.getByText("1 (test_video.mp4 · Track #6)")).toBeInTheDocument();
      expect(screen.getByText("AVAILABLE / PARTIAL")).toBeInTheDocument();
      expect(screen.getByText("NOT AVAILABLE (NOT PROVEN)")).toBeInTheDocument();
      expect(screen.getByText("NOT AVAILABLE (NOT OBSERVED)")).toBeInTheDocument();
      expect(screen.getAllByText("UNVERIFIED").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("NOT AVAILABLE").length).toBeGreaterThanOrEqual(1);
    });
  });
});
