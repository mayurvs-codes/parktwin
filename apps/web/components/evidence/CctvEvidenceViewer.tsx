'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Camera,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type CctvCameraId = 'CAM-01' | 'CAM-02' | 'CAM-03';

interface FrameDetail {
  file: string;
  frameNumber: number;
  timeSec: number;
  description: string;
}

export interface EvidenceStatusBreakdown {
  observed: string[];
  inferred?: string[];
  unverified?: string[];
  applicationState?: string[];
  notObserved: string[];
  statusFooter: string;
}

interface CameraConfig {
  id: CctvCameraId;
  name: string;
  roleName: string;
  source: string;
  videoUrl: string;
  fps: number;
  durationSec: number;
  resolution: string;
  evidenceBadge: string;
  badgeVariant: 'emerald' | 'amber' | 'sky';
  observation: string;
  limitation?: string;
  identityLinkage?: string;
  observationBadge?: string;
  frames: FrameDetail[];
  evidenceBreakdown: EvidenceStatusBreakdown;
  physicalPlate?: {
    plate: string;
    vehicle: string;
    status: string;
  };
  anprDetails?: {
    plate: string;
    confidence: string;
    engine: string;
    trackId: number;
    sourceClip?: string;
    provenance?: string;
  };
  parkedVehicles?: Array<{
    plate: string;
    type: string;
    color: string;
    status: string;
  }>;
  exitInfrastructure?: string[];
}

const CAMERAS_CONFIG: Record<CctvCameraId, CameraConfig> = {
  'CAM-01': {
    id: 'CAM-01',
    name: 'B2 Entrance Gate (Barricade)',
    roleName: 'ENTRY GATEWAY',
    source: 'IP Camera 3 / Carparking-01 (DVR Channel 1)',
    videoUrl: '/videos/cam1_entry_gate.mp4',
    fps: 25.0,
    durationSec: 15.0,
    resolution: '1280×720',
    evidenceBadge: 'INDEPENDENT CCTV ENTRY EVIDENCE',
    badgeVariant: 'emerald',
    observationBadge: 'CCTV ENTRY OBSERVED',
    observation:
      'Physical vehicle approach, boom barrier arm opening, and threshold transit through B2 entrance. The physical vehicle in this 25fps DVR clip is a maroon hatchback (Toyota Glanza/Yaris) with license plate visually legible as KA05ML7220 on the front bumper. Automated OCR was not executed directly on this DVR recording.',
    limitation:
      'Observation ends once vehicle passes barrier threshold. Subsequent aisle movement, parking bay guidance, and facility exit are governed by application logic (A* Navigation Router).',
    identityLinkage:
      'Physical CAM-01 footage displays KA05ML7220 (visually observed). Machine ANPR Track #6 (KA04MN8049, 98% PaddleOCR) originates from the independent benchmark video (test_video.mp4). Cross-camera continuous vehicle identity is unverified; CAM-01 did not recognize KA04MN8049.',
    physicalPlate: {
      plate: 'KA05ML7220',
      vehicle: 'Toyota Glanza/Yaris (Maroon)',
      status: 'CCTV VISUALLY VERIFIED, OCR UNVERIFIED',
    },
    evidenceBreakdown: {
      observed: [
        'Vehicle visible at B2 entrance lane (Maroon hatchback, Toyota Glanza/Yaris)',
        'Boom barrier arm opening and vehicle crossing gate threshold',
        'License plate visually legible on bumper: KA05ML7220 (Visually observed, OCR unverified)',
      ],
      inferred: [
        'Machine ANPR Track #6: KA04MN8049 (98% PaddleOCR, source: test_video.mp4)',
      ],
      unverified: [
        'Identity linkage: UNVERIFIED (CAM-01 physical KA05ML7220 ≠ ANPR benchmark KA04MN8049)',
      ],
      applicationState: [
        'Application vehicle identity: VEH-001',
        'Facility gateway registration: ACCESS_POINT_B2',
      ],
      notObserved: [
        'In-facility transit / aisle maneuvering (governed by A* router)',
        'Parking bay arrival sequence or parking maneuver into SP-24',
        'Parking dwell duration & bay occupancy',
        'Facility egress through exit ramp',
      ],
      statusFooter: 'PARTIAL — DOES NOT PROVE COMPLETE VEHICLE LIFECYCLE',
    },
    frames: [
      {
        file: '/evidence/entry/cam1_entry_gate_f30.png',
        frameNumber: 30,
        timeSec: 1.2,
        description: 'Vehicle approach to entry barrier',
      },
      {
        file: '/evidence/entry/cam1_entry_gate_f75.png',
        frameNumber: 75,
        timeSec: 3.0,
        description: 'Boom barrier raised, vehicle entering gate lane',
      },
      {
        file: '/evidence/entry/cam1_entry_gate_f150.png',
        frameNumber: 150,
        timeSec: 6.0,
        description: 'Mid-passage past camera perspective',
      },
      {
        file: '/evidence/entry/cam1_entry_gate_f250.png',
        frameNumber: 250,
        timeSec: 10.0,
        description: 'Vehicle clearing gate threshold',
      },
      {
        file: '/evidence/entry/cam1_entry_gate_f350.png',
        frameNumber: 350,
        timeSec: 14.0,
        description: 'Entry gateway returning to standby monitoring',
      },
    ],
    anprDetails: {
      plate: 'KA04MN8049',
      confidence: '98%',
      engine: 'PaddleOCR + YOLOv8 + ByteTrack',
      trackId: 6,
      sourceClip: 'test_video.mp4 (Pipeline Run fd3b28581430)',
      provenance: 'RAW ANPR DATA (BENCHMARK PIPELINE)',
    },
  },
  'CAM-02': {
    id: 'CAM-02',
    name: 'B2 Parking Bay Cluster (Zone A)',
    roleName: 'PARKING BAY SURVEILLANCE',
    source: 'IP Camera 16 (B2-Cam 11) / Carparking-01 (DVR Channel 10)',
    videoUrl: '/videos/cam2_parking_bay.mp4',
    fps: 25.0,
    durationSec: 15.0,
    resolution: '1280×720',
    evidenceBadge: 'PARKED OCCUPANCY OBSERVED',
    badgeVariant: 'emerald',
    observationBadge: 'VISUALLY OBSERVED (NO ANPR)',
    observation:
      'Stationary parked vehicles situated in designated perpendicular bays with visible white stall markings. CAM-02 does NOT run automated ANPR in this clip; plate identifiers represent visual video inspection and facility manifest metadata.',
    limitation:
      'PARKING MANEUVER: NOT OBSERVED. All vehicles are visibly stationary inside marked bays throughout the entire 14.96-second clip (average frame difference 2.24). No entering, reversing, or parking maneuvers occur in this recording.',
    identityLinkage:
      'The parked vehicles below are independent vehicles observed in Zone A; no continuous multi-camera tracker connects the entry vehicle to these specific stalls.',
    evidenceBreakdown: {
      observed: [
        'Designated perpendicular parking bays with white stall markings (Zone A)',
        'Stationary parked vehicles: Tata Punch (KA05ND1565) and Hyundai Venue (KA03NY0035)',
        'Continuous stationary dwell throughout 14.96s recording (average frame difference 2.24)',
      ],
      notObserved: [
        'Parking maneuver: NOT OBSERVED (all vehicles remain stationary inside marked bays; no entering, reversing, or parking maneuvers in recording)',
        'Vehicle arrival or departure sequence',
        'Dynamic demo vehicle parking actions (VEH-001 to VEH-005)',
      ],
      applicationState: [
        'Active demo vehicle bay assignments (e.g., SP-08, SP-14, SP-17, SP-24, SP-31)',
        'Session duration counters and tariff accumulation',
        'Bay occupancy state transitions triggered by software arrival',
      ],
      statusFooter: 'PARTIAL — DOES NOT PROVE COMPLETE VEHICLE LIFECYCLE',
    },
    frames: [
      {
        file: '/evidence/parking/cam2_parking_bay_f30.png',
        frameNumber: 30,
        timeSec: 1.2,
        description: 'Overview of stalls with KA05ND1565 and KA03NY0035 parked',
      },
      {
        file: '/evidence/parking/cam2_parking_bay_f75.png',
        frameNumber: 75,
        timeSec: 3.0,
        description: 'Stationary dwell observation (t = 3.0s)',
      },
      {
        file: '/evidence/parking/cam2_parking_bay_f150.png',
        frameNumber: 150,
        timeSec: 6.0,
        description: 'Stationary dwell observation (t = 6.0s)',
      },
      {
        file: '/evidence/parking/cam2_parking_bay_f250.png',
        frameNumber: 250,
        timeSec: 10.0,
        description: 'Stationary dwell observation (t = 10.0s)',
      },
      {
        file: '/evidence/parking/cam2_parking_bay_f350.png',
        frameNumber: 350,
        timeSec: 14.0,
        description: 'Persistent bay occupancy confirmed (t = 14.0s)',
      },
    ],
    parkedVehicles: [
      {
        plate: 'KA05ND1565',
        type: 'Tata Punch (Dark Grey)',
        color: 'Dark Grey',
        status: 'CCTV VISUALLY VERIFIED, OCR UNVERIFIED',
      },
      {
        plate: 'KA03NY0035',
        type: 'Hyundai Venue (manifest typo: KA03MY0035)',
        color: 'White',
        status: 'CCTV VISUALLY VERIFIED, OCR UNVERIFIED',
      },
      {
        plate: 'Vehicle visible — plate not readable',
        type: 'Maruti Baleno (scenario ID: KA41MG7586)',
        color: 'Dark Metallic',
        status: 'DEMO SCENARIO ONLY',
      },
    ],
  },
  'CAM-03': {
    id: 'CAM-03',
    name: 'B2 Exit Ramp & Barrier (ACCESS_POINT_B2)',
    roleName: 'EXIT GATEWAY',
    source: 'IP Camera 5 (B2-Baricade Exit Cam 2) / Carparking-01 (DVR Channel 16)',
    videoUrl: '/videos/cam3_exit_ramp.mp4',
    fps: 25.0,
    durationSec: 15.0,
    resolution: '1280×720',
    evidenceBadge: 'EXIT INFRASTRUCTURE CCTV',
    badgeVariant: 'sky',
    observationBadge: 'INFRASTRUCTURE OBSERVED',
    observation:
      'Physical exit gateway infrastructure verified: automatic boom barrier arm, access card scanner pedestal, speed bumps, and ramp roadway. No physical vehicle egress is visible in this recording. Application exit event: APP_DECISION. No physical vehicle egress recording is currently available in the supplied evidence set.',
    limitation:
      'VEHICLE EGRESS: NOT OBSERVED IN SOURCE CLIP. No physical vehicle egress is visible in this recording. Application exit event: APP_DECISION. Barrier remains stationary in standby throughout 14.96s recording. Roadway is clear. No physical vehicle egress recording is currently available in the supplied evidence set.',
    evidenceBreakdown: {
      observed: [
        'Exit gateway infrastructure: automatic boom barrier arm (standby position)',
        'Driver access card scanner pedestal & dual rubber speed bumps',
        'Dedicated ramp egress roadway to street level',
      ],
      notObserved: [
        'Vehicle egress: NOT OBSERVED IN SOURCE CLIP (roadway clear, barrier stationary throughout 14.96s clip)',
        'Moving vehicle exiting facility or clearing barrier',
      ],
      applicationState: [
        'Application exit event: APP_DECISION (software session finalization)',
        'Digital Twin vehicle despan / removal from active map',
        'Bay state returned from OCCUPIED to AVAILABLE',
      ],
      statusFooter: 'EXIT RECORDED — CCTV PROOF NOT AVAILABLE IN SOURCE CLIP',
    },
    frames: [
      {
        file: '/evidence/exit/cam3_exit_ramp_f30.png',
        frameNumber: 30,
        timeSec: 1.2,
        description: 'Exit roadway, speed bumps, and scanner pedestal',
      },
      {
        file: '/evidence/exit/cam3_exit_ramp_f75.png',
        frameNumber: 75,
        timeSec: 3.0,
        description: 'Exit barrier arm and speed bumps (t = 3.0s)',
      },
      {
        file: '/evidence/exit/cam3_exit_ramp_f150.png',
        frameNumber: 150,
        timeSec: 6.0,
        description: 'Standby surveillance of exit threshold (t = 6.0s)',
      },
      {
        file: '/evidence/exit/cam3_exit_ramp_f250.png',
        frameNumber: 250,
        timeSec: 10.0,
        description: 'Exit corridor view (t = 10.0s)',
      },
      {
        file: '/evidence/exit/cam3_exit_ramp_f350.png',
        frameNumber: 350,
        timeSec: 14.0,
        description: 'Egress gate standby monitoring (t = 14.0s)',
      },
    ],
    exitInfrastructure: [
      'Automatic Boom Barrier Arm (Exit Egress)',
      'Driver Access Card Scanner Pedestal',
      'Dual Rubber Speed Breakers',
      'Dedicated Ramp Egress Lane to Street Level',
    ],
  },
};

export interface CctvEvidenceViewerProps {
  initialCamera?: CctvCameraId;
  onCameraChange?: (cam: CctvCameraId) => void;
  className?: string;
  showTitle?: boolean;
}

export function CctvEvidenceViewer({
  initialCamera = 'CAM-01',
  onCameraChange,
  className = '',
  showTitle = true,
}: CctvEvidenceViewerProps) {
  const [activeCamera, setActiveCamera] = useState<CctvCameraId>(initialCamera);
  const [viewMode, setViewMode] = useState<'VIDEO' | 'FRAMES'>('VIDEO');
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [playbackStatus, setPlaybackStatus] = useState<string>('Ready');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setActiveCamera(initialCamera);
    setSelectedFrameIndex(0);
    setPlaybackStatus('Ready');
  }, [initialCamera]);

  const config = CAMERAS_CONFIG[activeCamera];
  const currentFrame = config.frames[selectedFrameIndex] || config.frames[0];

  const handleSelectCamera = (camId: CctvCameraId) => {
    setActiveCamera(camId);
    setSelectedFrameIndex(0);
    setPlaybackStatus('Ready');
    onCameraChange?.(camId);
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="cctv-evidence-viewer">
      {/* ── Top Header Ribbon ── */}
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                Genuine CCTV / ANPR Ground Truth
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black font-mono tracking-tight text-white mt-0.5">
              REAL CCTV EVIDENCE VIEWER
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Authoritative sensor records from Carparking-01 · 27-Aug-2026 DVR Archives
            </p>
          </div>

          {/* Evidence Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                config.badgeVariant === 'emerald'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
              }`}
            >
              ● {config.evidenceBadge}
            </span>
          </div>
        </div>
      )}

      {/* ── Camera Tabs & Mode Switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        {/* Camera Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['CAM-01', 'CAM-02', 'CAM-03'] as CctvCameraId[]).map((camId) => {
            const isSelected = camId === activeCamera;
            const c = CAMERAS_CONFIG[camId];
            return (
              <Button
                key={camId}
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => handleSelectCamera(camId)}
                className={`font-mono text-xs gap-1.5 h-8 ${
                  isSelected
                    ? 'bg-sky-600 hover:bg-sky-500 text-white font-bold'
                    : 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{camId}</span>
                <span className="text-[10px] opacity-70 hidden sm:inline">• {c.roleName.split(' ')[0]}</span>
              </Button>
            );
          })}
        </div>

        {/* View Mode Toggle: Video vs Extracted Frames */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <Button
            size="sm"
            variant={viewMode === 'VIDEO' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('VIDEO')}
            className={`font-mono text-xs gap-1 h-7 px-2.5 ${
              viewMode === 'VIDEO' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>VIDEO (HTML5)</span>
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'FRAMES' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('FRAMES')}
            className={`font-mono text-xs gap-1 h-7 px-2.5 ${
              viewMode === 'FRAMES' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>FRAMES (5)</span>
          </Button>
        </div>
      </div>

      {/* ── Main Media Display Stage ── */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl flex flex-col items-center justify-center min-h-[320px] max-h-[480px]">
        {viewMode === 'VIDEO' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black relative group">
            <video
              ref={videoRef}
              key={config.videoUrl}
              src={config.videoUrl}
              controls
              playsInline
              className="w-full max-h-[420px] object-contain"
              onLoadedMetadata={() => setPlaybackStatus('Loaded (25fps)')}
              onPlay={() => setPlaybackStatus('Playing')}
              onPause={() => setPlaybackStatus('Paused')}
              onSeeked={() => setPlaybackStatus('Seeked')}
              onError={() => setPlaybackStatus('Video Error')}
            />
            {/* Archived CCTV OSD Overlay Ribbon */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300">
              <span className="text-amber-400 font-bold">● RECORDED</span>
              <span>{config.id}</span>
              <span className="text-slate-500">|</span>
              <span>ARCHIVED DVR PLAYBACK</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400 font-semibold">{playbackStatus}</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={currentFrame?.file}
              src={currentFrame?.file}
              alt={currentFrame?.description}
              className="w-full max-h-[420px] object-contain"
            />
            {/* OSD Frame Banner */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300">
              <span className="text-sky-400 font-bold">FRAME {currentFrame?.frameNumber}</span>
              <span className="text-slate-500">|</span>
              <span>t = {currentFrame?.timeSec}s</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400">{config.id}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Frame Scrubber (Only visible in FRAMES mode) ── */}
      {viewMode === 'FRAMES' && (
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">SELECT VERIFIED CCTV FRAME:</span>
            <span className="text-sky-400 font-bold">
              {currentFrame?.description} (t = {currentFrame?.timeSec}s)
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {config.frames.map((f, idx) => {
              const isSelected = idx === selectedFrameIndex;
              return (
                <button
                  key={f.frameNumber}
                  type="button"
                  onClick={() => setSelectedFrameIndex(idx)}
                  className={`p-2 rounded-lg text-left transition-all border font-mono text-xs ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/20 text-sky-300 shadow-md ring-1 ring-sky-500'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-[11px]">Frame {f.frameNumber}</div>
                  <div className="text-[10px] opacity-70">t = {f.timeSec}s</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Structured Evidence Status Breakdown Panel ── */}
      <div
        className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 font-mono text-xs shadow-lg"
        data-testid="evidence-status-breakdown"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              EVIDENCE STATUS BREAKDOWN · {config.id}
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Physical Evidence Facts vs Application State Separation
            </h3>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full border border-slate-700 bg-slate-900 text-slate-300 font-semibold self-start sm:self-auto">
            ACADEMIC AUDIT STANDARD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* OBSERVED */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                OBSERVED IN CCTV
              </span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-300">
                PHYSICAL FACT
              </Badge>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {config.evidenceBreakdown.observed.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* INFERRED & UNVERIFIED */}
          {(config.evidenceBreakdown.inferred || config.evidenceBreakdown.unverified) && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  INFERRED / UNVERIFIED
                </span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-300">
                  ML & REASONING
                </Badge>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {config.evidenceBreakdown.inferred?.map((item, idx) => (
                  <li key={`inf-${idx}`} className="flex items-start gap-1.5">
                    <span className="text-sky-400 font-bold shrink-0">ℹ</span>
                    <span>{item}</span>
                  </li>
                ))}
                {config.evidenceBreakdown.unverified?.map((item, idx) => (
                  <li key={`unv-${idx}`} className="flex items-start gap-1.5 text-amber-200">
                    <span className="text-amber-400 font-bold shrink-0">⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* APPLICATION STATE */}
          {config.evidenceBreakdown.applicationState && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                  APPLICATION STATE
                </span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-500/40 text-purple-300">
                  SOFTWARE ONLY
                </Badge>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {config.evidenceBreakdown.applicationState.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold shrink-0">◆</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* NOT OBSERVED */}
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                NOT OBSERVED IN CCTV
              </span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-rose-500/40 text-rose-300">
                ABSENT FROM CLIP
              </Badge>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {config.evidenceBreakdown.notObserved.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-rose-400 font-bold shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Status Footer Banner */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>{config.evidenceBreakdown.statusFooter}</span>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            DVR Source: {config.source}
          </span>
        </div>
      </div>

      {/* ── Metadata & Verification Details Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Physical Sensor Metadata */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-300 font-bold">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Camera className="h-3.5 w-3.5" />
              CCTV Camera Metadata
            </span>
            <span>{config.id}</span>
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Camera Name:</span>
            <span className="text-slate-200 font-semibold">{config.name}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Hardware Source:</span>
            <span className="text-slate-300">{config.source}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Recording Mode:</span>
            <span className="text-slate-300">Archived DVR Clip (25.0 fps · 14.96s)</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Resolution & FPS:</span>
            <span className="text-emerald-400 font-bold">
              {config.resolution} @ {config.fps} fps (15.0s clip)
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Source Asset Path:</span>
            <span className="text-sky-400 truncate max-w-[220px]">{config.videoUrl}</span>
          </div>
        </div>

        {/* Right Column: Physical Ground Truth Observation & ANPR */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-300 font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Physical Observation Facts
            </span>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
              {config.observationBadge || 'CCTV OBSERVED'}
            </Badge>
          </div>

          <p className="text-slate-300 leading-relaxed py-0.5">{config.observation}</p>

          {/* Physically Observed Vehicle & Plate (e.g. CAM-01 KA05ML7220) */}
          {/* Physical CCTV Observation */}
          {config.physicalPlate && (
            <div className="mt-2 rounded-lg bg-slate-950/70 p-2.5 border border-slate-800 space-y-1">
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>PHYSICAL CCTV</span>
                <span className="text-[9px] text-emerald-400 font-normal">GROUND TRUTH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plate:</span>
                <span className="text-emerald-400 font-bold font-mono">{config.physicalPlate.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-semibold text-[10px]">{config.physicalPlate.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vehicle:</span>
                <span className="text-slate-300">{config.physicalPlate.vehicle}</span>
              </div>
            </div>
          )}

          {/* ANPR Pipeline Benchmark Inference */}
          {config.anprDetails && (
            <div className="mt-2 rounded-lg bg-slate-950/70 p-2.5 border border-slate-800 space-y-1">
              <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>ANPR BENCHMARK</span>
                <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[9px] py-0 px-1 font-mono">
                  INDEPENDENT BENCHMARK
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plate:</span>
                <span className="text-sky-400 font-bold font-mono">{config.anprDetails.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Track:</span>
                <span className="text-sky-400 font-semibold">#{config.anprDetails.trackId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confidence:</span>
                <span className="text-slate-300">
                  {config.anprDetails.confidence} ({config.anprDetails.engine})
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Source:</span>
                <span className="text-slate-300">test_video.mp4</span>
              </div>
              <div className="flex justify-between text-[10px] pt-0.5 border-t border-slate-800/80">
                <span className="text-slate-400">Status:</span>
                <span className="text-amber-300 font-semibold">INDEPENDENT BENCHMARK</span>
              </div>
            </div>
          )}

          {/* Specific CAM-02 Parked Vehicles */}
          {config.parkedVehicles && (
            <div className="mt-2 rounded-lg bg-slate-950/70 p-2 border border-slate-800 space-y-1.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Verified Parked Vehicles in View
              </div>
              {config.parkedVehicles.map((v) => (
                <div key={v.plate} className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-bold">{v.plate}</span>
                  <span className="text-slate-300">
                    {v.type} ({v.color})
                  </span>
                  <span className="text-slate-400 text-[10px]">{v.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Specific CAM-03 Exit Infrastructure */}
          {config.exitInfrastructure && (
            <div className="mt-2 rounded-lg bg-slate-950/70 p-2 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Physical Exit Hardware Verified
              </div>
              {config.exitInfrastructure.map((item, idx) => (
                <div key={idx} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Strict Engineering Boundaries & Limitations Callout ── */}
      {config.limitation && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-1.5 text-xs font-mono text-amber-200/90">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Honest Evidence Boundary & Limitation Notice</span>
          </div>
          <p className="leading-relaxed pl-6">{config.limitation}</p>
          {config.identityLinkage && (
            <div className="mt-2 pl-6 pt-2 border-t border-amber-500/30 space-y-1">
              <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                IDENTITY LINKAGE: UNVERIFIED
              </div>
              <p className="leading-relaxed text-amber-200/85 italic">
                {config.identityLinkage}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Three-Tier Architecture Mapping ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2 text-xs font-mono">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-sky-400" />
          <span>Three-Tier Architectural Provenance</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-emerald-400">LEVEL 1: CCTV GROUND TRUTH</div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Physical video stream from {config.id} ({config.source}). Frame-accurate sensor facts.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-sky-400">LEVEL 2: APPLICATION LOGIC</div>
            <p className="text-[11px] text-slate-300 leading-snug">
              State transitions, A* aisle guidance, dwell duration counters, and tariff calculations.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-purple-400">LEVEL 3: DIGITAL TWIN</div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Canonical 1472×1508 L-shaped virtual replica rendering bays SP-01 to SP-60 and ACCESS_POINT_B2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
