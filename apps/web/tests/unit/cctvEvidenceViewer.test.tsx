import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CctvEvidenceViewer } from '@/components/evidence/CctvEvidenceViewer';
import { useCctvEvidenceModalStore } from '@/store/useCctvEvidenceModalStore';

describe('CctvEvidenceViewer & Modal Store', () => {
  it('1. useCctvEvidenceModalStore manages open/close and active camera', () => {
    expect(useCctvEvidenceModalStore.getState().isOpen).toBe(false);

    useCctvEvidenceModalStore.getState().openModal({ camera: 'CAM-02' });
    expect(useCctvEvidenceModalStore.getState().isOpen).toBe(true);
    expect(useCctvEvidenceModalStore.getState().activeCamera).toBe('CAM-02');

    useCctvEvidenceModalStore.getState().setActiveCamera('CAM-03');
    expect(useCctvEvidenceModalStore.getState().activeCamera).toBe('CAM-03');

    useCctvEvidenceModalStore.getState().closeModal();
    expect(useCctvEvidenceModalStore.getState().isOpen).toBe(false);
  });

  it('2. Renders CAM-01 by default with real ANPR metadata and HTML5 video', () => {
    render(<CctvEvidenceViewer initialCamera="CAM-01" />);

    expect(screen.getByTestId('cctv-evidence-viewer')).toBeInTheDocument();
    expect(screen.getByText('REAL CCTV EVIDENCE VIEWER')).toBeInTheDocument();
    expect(screen.getByText('● INDEPENDENT CCTV ENTRY EVIDENCE')).toBeInTheDocument();
    expect(screen.getByText('KA05ML7220')).toBeInTheDocument();
    expect(screen.getByText('KA04MN8049')).toBeInTheDocument();
    expect(screen.getByText(/PaddleOCR \+ YOLOv8 \+ ByteTrack/)).toBeInTheDocument();
    expect(screen.getByText(/IDENTITY LINKAGE: UNVERIFIED/)).toBeInTheDocument();
  });

  it('3. Displays CAM-02 parked vehicles and honest limitation notice', () => {
    render(<CctvEvidenceViewer initialCamera="CAM-02" />);

    expect(screen.getByText('● PARKED OCCUPANCY OBSERVED')).toBeInTheDocument();
    expect(screen.getByText('KA05ND1565')).toBeInTheDocument();
    expect(screen.getByText('KA03NY0035')).toBeInTheDocument();
    expect(screen.getByText(/KA41MG7586/)).toBeInTheDocument();
    expect(screen.getByText(/Vehicle visible — plate not readable/)).toBeInTheDocument();

    // Verify honest limitation notice
    expect(screen.getByText(/PARKING MANEUVER: NOT OBSERVED/)).toBeInTheDocument();
    expect(screen.getByText(/IDENTITY LINKAGE: UNVERIFIED/)).toBeInTheDocument();
  });

  it('4. Displays CAM-03 exit hardware and unobserved egress notice', () => {
    render(<CctvEvidenceViewer initialCamera="CAM-03" />);

    expect(screen.getByText(/EXIT INFRASTRUCTURE CCTV/)).toBeInTheDocument();
    expect(screen.getByText('Automatic Boom Barrier Arm (Exit Egress)')).toBeInTheDocument();
    expect(screen.getByText('Driver Access Card Scanner Pedestal')).toBeInTheDocument();

    // Verify limitation notice
    expect(screen.getByText(/VEHICLE EGRESS: NOT OBSERVED IN SOURCE CLIP/)).toBeInTheDocument();
  });

  it('5. Switches view mode to FRAMES and toggles frame scrubber', () => {
    render(<CctvEvidenceViewer initialCamera="CAM-01" />);

    const framesBtn = screen.getByText('FRAMES (5)');
    fireEvent.click(framesBtn);

    expect(screen.getByText(/SELECT VERIFIED CCTV FRAME/)).toBeInTheDocument();
    expect(screen.getByText('Frame 30')).toBeInTheDocument();
    expect(screen.getByText('Frame 75')).toBeInTheDocument();
    expect(screen.getByText('Frame 150')).toBeInTheDocument();
    expect(screen.getByText('Frame 250')).toBeInTheDocument();
    expect(screen.getByText('Frame 350')).toBeInTheDocument();
  });
});
