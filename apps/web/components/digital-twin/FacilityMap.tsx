"use client";

import React, { useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Target,
  Layers,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import {
  FACILITY_SVG_GEOMETRY,
  ACCESS_POINT_B2,
  isSlotReserved,
} from "./demoScenarioData";
import { ArchitecturalBlueprintLayers, CadCarSymbol } from "./ArchitecturalBlueprintLayers";
import { useSharedDemoState, FOCUSED_ZONE_SPACE_IDS } from "@/store/useSharedDemoState";

/**
 * Architectural compound boundary framing exactly the 20 Focused Demo Zone spaces:
 * Row A: SP-01 to SP-13 (North Perimeter)
 * Driveway: Top Horizontal Drive Aisle
 * Row B: SP-14 to SP-20 (Upper Island North Stalls)
 * Stalls SP-21 and Row 2 (SP-22..29) are excluded cleanly.
 */
const FOCUSED_ZONE_PATH = `M 470 295
  L 1169 295
  A 6 6 0 0 1 1175 301
  L 1175 567
  A 6 6 0 0 1 1169 573
  L 470 573
  A 6 6 0 0 1 464 567
  L 464 301
  A 6 6 0 0 1 470 295
  Z`;

export interface FacilityMapProps {
  onSlotSelect?: (slotId: string) => void;
  onVehicleSelect?: (vehicleId: string) => void;
  onCameraSelect?: (cameraId: string) => void;
  children?: React.ReactNode;
  highlightSlotId?: string | null;
  hideAdminControls?: boolean;
  showAdminVehicles?: boolean;
  showAdminRoutes?: boolean;
}

export function FacilityMap({
  onSlotSelect,
  onVehicleSelect,
  onCameraSelect,
  children,
  highlightSlotId,
  hideAdminControls = false,
  showAdminVehicles = true,
  showAdminRoutes = true,
}: FacilityMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Shared End-to-End Demo Store (authoritative for focused zone SP-01 to SP-20)
  const sharedDemoSpaces = useSharedDemoState((s) => s.spaces);
  const sharedSelectedSpaceId = useSharedDemoState((s) => s.selectedSpaceId);
  const selectSharedSpace = useSharedDemoState((s) => s.selectSpace);

  // Zustand Store bindings
  const spaces = useDemoMovieStore((s) => s.spaces);
  const vehicles = useDemoMovieStore((s) => s.vehicles);
  const cameras = useDemoMovieStore((s) => s.cameras);
  const selectedVehicleId = useDemoMovieStore((s) => s.selectedVehicleId);
  const rawSelectedSlotId = useDemoMovieStore((s) => s.selectedSlotId);
  const selectedSlotId = rawSelectedSlotId || sharedSelectedSpaceId;
  const selectedCameraId = useDemoMovieStore((s) => s.selectedCameraId);
  const layerVisibility = useDemoMovieStore((s) => s.layerVisibility);
  const selectVehicle = useDemoMovieStore((s) => s.selectVehicle);
  const selectSlot = useDemoMovieStore((s) => s.selectSlot);
  const selectCamera = useDemoMovieStore((s) => s.selectCamera);
  const toggleLayer = useDemoMovieStore((s) => s.toggleLayer);

  // Zoom & Pan state: default view centers and prioritizes Island 1 and the Focused Demo Zone as hero
  const DEFAULT_FOCUSED_VIEW = {
    zoom: 1.55,
    pan: { x: -85, y: 220 },
  };

  const [zoom, setZoom] = useState(DEFAULT_FOCUSED_VIEW.zoom);
  const [pan, setPan] = useState(DEFAULT_FOCUSED_VIEW.pan);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [hoveredVehicleId, setHoveredVehicleId] = useState<string | null>(null);
  const [showLayersMenu, setShowLayersMenu] = useState(false);

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(1)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)));
  const handleResetZoomPan = () => {
    setZoom(DEFAULT_FOCUSED_VIEW.zoom);
    setPan(DEFAULT_FOCUSED_VIEW.pan);
  };
  const handleFitEntireFacility = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCenterSelected = () => {
    let targetX: number | null = null;
    let targetY: number | null = null;

    if (selectedSlotId) {
      const s = spaces.find((sp) => sp.id === selectedSlotId);
      if (s) {
        targetX = s.x;
        targetY = s.y;
      }
    } else if (selectedVehicleId) {
      const v = vehicles.find((veh) => veh.id === selectedVehicleId);
      if (v && v.currentPosition) {
        targetX = v.currentPosition[0];
        targetY = v.currentPosition[1];
      }
    } else if (selectedCameraId) {
      const c = cameras.find((cam) => cam.id === selectedCameraId);
      if (c) {
        targetX = c.x;
        targetY = c.y;
      }
    }

    if (targetX !== null && targetY !== null) {
      const newZoom = 1.6;
      // Map center is 1472 / 2 = 736, 1508 / 2 = 754
      const panX = (736 - targetX) * (newZoom / 1.5);
      const panY = (754 - targetY) * (newZoom / 1.5);
      setZoom(newZoom);
      setPan({ x: Math.round(panX), y: Math.round(panY) });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(2.5, Math.max(0.5, +(z + delta).toFixed(2))));
  };

  // Currently selected vehicle or currently moving vehicle for route display
  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const routePoints = activeVehicle?.activeRoute ?? [];
  const startNode = routePoints.length > 1 ? routePoints[0] : null;
  const endNode = routePoints.length > 1 ? routePoints[routePoints.length - 1] : null;

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden select-none shadow-2xl flex flex-col">
      {/* ─── Top Floating Controls Toolbar ──────────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
        {/* Layers Menu Trigger */}
        {!hideAdminControls && (
          <div className="relative">
            <Button
              variant={showLayersMenu ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 px-2.5 text-xs font-mono gap-1.5 rounded-lg border backdrop-blur-md shadow-lg transition-all ${
                showLayersMenu
                  ? "bg-slate-800 text-white border-sky-500/50"
                  : "bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
              }`}
              onClick={() => setShowLayersMenu(!showLayersMenu)}
              title="Toggle Map Data Layers"
            >
              <Layers className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">Layers</span>
            </Button>

            {/* Layers Popover Dropdown */}
            {showLayersMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-700/90 bg-slate-900/95 p-2.5 shadow-2xl backdrop-blur-xl z-40 text-xs font-mono space-y-1">
                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 flex items-center justify-between">
                  <span>DISPLAY</span>
                  <span className="text-[9px] text-slate-500 font-medium">FACILITY LAYERS</span>
                </div>

                {[
                  { id: "parking", label: "Parking Bays", color: "bg-emerald-400", active: layerVisibility.parking },
                  { id: "vehicles", label: "Vehicles", color: "bg-sky-400", active: layerVisibility.vehicles },
                  { id: "cameras", label: "Cameras (16)", color: "bg-blue-400", active: layerVisibility.cameras },
                  { id: "coverage", label: "Camera Coverage", color: "bg-indigo-400", active: layerVisibility.coverage },
                  { id: "zones", label: "Facility Zones", color: "bg-cyan-400", active: layerVisibility.zones },
                  { id: "routes", label: "Navigation Routes", color: "bg-amber-400", active: layerVisibility.routes },
                  { id: "infrastructure", label: "CAD Infrastructure", color: "bg-rose-400", active: layerVisibility.infrastructure },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleLayer(item.id as keyof typeof layerVisibility)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800/80 text-left transition-colors group"
                  >
                    <span className="flex items-center gap-2 text-slate-200 group-hover:text-white">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="text-[11px]">{item.label}</span>
                    </span>
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                        item.active
                          ? "border-sky-500/80 bg-sky-500/20 text-sky-400"
                          : "border-slate-700 bg-slate-800/40 text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Zoom, Pan, Center Controls */}
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-700/80 bg-slate-900/90 p-0.5 backdrop-blur-md shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={handleZoomIn}
            title="Zoom In (+)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={handleZoomOut}
            title="Zoom Out (−)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={handleResetZoomPan}
            title="Focus Demo Zone (Home)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
            onClick={handleFitEntireFacility}
            title="Fit Entire Facility"
          >
            <Maximize2 className="h-3 w-3" />
            <span className="text-[10px]">FIT</span>
          </Button>
          {(selectedSlotId || selectedVehicleId || selectedCameraId) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sky-400 hover:text-sky-200 hover:bg-sky-500/20"
              onClick={handleCenterSelected}
              title="Center on Selected Item"
            >
              <Target className="h-3.5 w-3.5 animate-pulse" />
            </Button>
          )}
          <span className="px-1.5 text-[10px] font-mono font-medium text-slate-400 border-l border-slate-800">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Facility Header Badge (Hidden in driver view to avoid HUD overlap) */}
      {!hideAdminControls && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 backdrop-blur-md shadow-lg pointer-events-none">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">Carparking-01 B2</span>
          <span className="text-[10px] font-mono text-slate-400 border-l border-slate-700 pl-2">
            60 Operational Spaces · 16 Verified Cameras
          </span>
        </div>
      )}

      {/* Access Point Status Indicator */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 backdrop-blur-md shadow-lg pointer-events-none">
        <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
        <span className="text-xs font-medium text-slate-200">
          ACCESS_POINT_B2
        </span>
        <span className="text-[10px] font-mono text-blue-400 border-l border-slate-700 pl-2">
          Single Physical Gateway (Entry & Exit)
        </span>
      </div>

      {/* ─── Main SVG Interactive Canvas ──────────────────────────────────────── */}
      <svg
        ref={svgRef}
        viewBox={FACILITY_SVG_GEOMETRY.viewBox}
        className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-75 flex-1"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: "center center",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          {/* 2D Animated Flow & Pulse Keyframes */}
          <style>{`
            @keyframes flowLaneEast {
              from { stroke-dashoffset: 32; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes flowLaneSouth {
              from { stroke-dashoffset: 32; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes routeCrawl {
              from { stroke-dashoffset: 28; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes carBeamPulse {
              0%, 100% { opacity: 0.65; }
              50% { opacity: 0.85; }
            }
            .flow-lane-e {
              animation: flowLaneEast 1.2s linear infinite;
            }
            .flow-lane-s {
              animation: flowLaneSouth 1.2s linear infinite;
            }
            .active-route-animated {
              animation: routeCrawl 1.0s linear infinite;
            }
            .car-beam-animated {
              animation: carBeamPulse 1.8s ease-in-out infinite;
            }
          `}</style>

          {/* Headlight Beam Linear Gradient */}
          <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#fef08a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </linearGradient>

          {/* Subtle Grid Pattern for Engineering Depth */}
          <pattern id="twinGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeWidth="1" />
          </pattern>

          {/* Ramp Void Hatch Pattern */}
          <pattern id="rampVoidHatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(244, 63, 94, 0.2)" strokeWidth="2" />
          </pattern>

          {/* Structural Core Pattern */}
          <pattern id="structuralHatch" width="12" height="12" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(100, 116, 139, 0.25)" strokeWidth="1.5" />
          </pattern>

          {/* Glowing Filters */}
          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.6" />
          </filter>
          <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#38bdf8" floodOpacity="0.8" />
          </filter>
          <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.5" />
          </filter>
          <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f59e0b" floodOpacity="0.75" />
          </filter>
          <filter id="glow-violation" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#ef4444" floodOpacity="0.9" />
          </filter>
          <filter id="assignedSlotGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#a855f7" floodOpacity="0.9" />
          </filter>
          {/* Camera Coverage Sector Gradient */}
          <radialGradient id="coverageGlow" cx="0%" cy="50%" r="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </radialGradient>
          {/* 3D Volumetric Vehicle Gradients & Shadows (Green or Red only) */}
          <linearGradient id="car3DGreenBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="25%" stopColor="#34d399" />
            <stop offset="60%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
          <linearGradient id="car3DRedBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="25%" stopColor="#f87171" />
            <stop offset="60%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="car3DGreenRoof" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="45%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="car3DRedRoof" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="45%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="carGlassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="35%" stopColor="#0f172a" />
            <stop offset="65%" stopColor="#334155" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <filter id="carDropShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* ─── LAYER 1: Background & Architectural Outer Boundary ─────────────── */}
        <rect width="1472" height="1508" fill="#070b14" />
        <rect width="1472" height="1508" fill="url(#twinGrid)" />

        {/* Facility Architectural Concrete Floor Plate */}
        <path
          d={FACILITY_SVG_GEOMETRY.outerBoundary}
          fill="#0c1322"
          stroke="#1e293b"
          strokeWidth="6"
        />

        {/* Structural Perimeter Wall Line */}
        <path
          d={FACILITY_SVG_GEOMETRY.outerBoundary}
          fill="none"
          stroke="#475569"
          strokeWidth="3.5"
        />

        {/* ─── LAYER 2: Drive Aisles (Continuous Roadway Network - Authentic CAD Brown Asphalt) ─ */}
        <g className="drive-aisles-layer">
          {FACILITY_SVG_GEOMETRY.driveAisles.map((aisle) => (
            <path
              key={aisle.id}
              d={aisle.d}
              fill="#2a1d14"
              stroke="#1a120c"
              strokeWidth="1.5"
            />
          ))}

          {/* Clean Subtle Physical Floor Lane Centerlines */}
          <line x1="70" y1="250" x2="1225" y2="250" stroke="#4a3524" strokeWidth="2" strokeDasharray="14 10" />
          <line x1="380" y1="610" x2="1225" y2="610" stroke="#4a3524" strokeWidth="2" strokeDasharray="14 10" />
          <line x1="380" y1="960" x2="1225" y2="960" stroke="#4a3524" strokeWidth="2" strokeDasharray="14 10" />
          <line x1="70" y1="1318" x2="1225" y2="1318" stroke="#4a3524" strokeWidth="2" strokeDasharray="14 10" />
          <line x1="1225" y1="90" x2="1225" y2="1318" stroke="#4a3524" strokeWidth="2" strokeDasharray="14 10" />
          <line x1="412" y1="250" x2="412" y2="1318" stroke="#4a3524" strokeWidth="2" strokeDasharray="14 10" />

          {/* 2D Animated Flow & Direction Overlay (Active when Routes toggle is ON) */}
          {layerVisibility.routes && (
            <g className="routes-flow-overlay">
              <line x1="70" y1="250" x2="1225" y2="250" stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="16 12" className="flow-lane-e" opacity="0.85" />
              <line x1="380" y1="610" x2="1225" y2="610" stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="16 12" className="flow-lane-e" opacity="0.85" />
              <line x1="380" y1="960" x2="1225" y2="960" stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="16 12" className="flow-lane-e" opacity="0.85" />
              <line x1="70" y1="1318" x2="1225" y2="1318" stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="16 12" className="flow-lane-e" opacity="0.85" />
              <line x1="1225" y1="90" x2="1225" y2="1318" stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="16 12" className="flow-lane-s" opacity="0.85" />
              <line x1="412" y1="250" x2="412" y2="1318" stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="16 12" className="flow-lane-s" opacity="0.85" />

              {/* Direction Flow Chevrons */}
              <path d="M 640 244 L 650 250 L 640 256" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 800 604 L 810 610 L 800 616" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 800 954 L 810 960 L 800 966" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 1219 400 L 1225 410 L 1231 400" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 1219 800 L 1225 810 L 1231 800" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 406 500 L 412 510 L 418 500" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 406 850 L 412 860 L 418 850" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}
        </g>

        {/* Row A Foundation Base (Architectural Concrete Slab) */}
        <g className="row-a-foundation-base" pointerEvents="none">
          <rect
            x={185}
            y={86}
            width={866}
            height={116}
            rx={4}
            fill="#0b1324"
            stroke="#334155"
            strokeWidth="1.8"
          />
          {/* Row A South Curb */}
          <line
            x1={185}
            y1={202}
            x2={1051}
            y2={202}
            stroke="#475569"
            strokeWidth="2.5"
          />
        </g>

        {/* ─── LAYER 3: Architectural Blueprint Structural Elements ───────────── */}
        <ArchitecturalBlueprintLayers layerVisibility={layerVisibility} />

        {/* Subtle architectural dimming of non-demo facility areas so focused zone is the crisp visual hero */}
        <path
          d={`M 0 0 L 1472 0 L 1472 1508 L 0 1508 Z ${FOCUSED_ZONE_PATH}`}
          fillRule="evenodd"
          fill="#070b14"
          opacity="0.32"
          pointerEvents="none"
        />

        {/* Zone Boundary Highlights (When Zones toggle is active) */}
        {layerVisibility.zones && (
          <g className="zone-labels-layer" pointerEvents="none">
            <g transform="translate(640, 75)">
              <rect x="-90" y="-12" width="180" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="0" y="4" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                Zone A (North Perimeter)
              </text>
            </g>
            <g transform="translate(820, 435)">
              <rect x="-85" y="-12" width="170" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="0" y="4" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                Zone B (Upper Island)
              </text>
            </g>
            <g transform="translate(820, 785)">
              <rect x="-95" y="-12" width="190" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="0" y="4" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                Zone C (Central Ramp Row)
              </text>
            </g>
            <g transform="translate(820, 1135)">
              <rect x="-85" y="-12" width="170" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="0" y="4" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                Zone D (Lower Island)
              </text>
            </g>
            <g transform="translate(740, 1475)">
              <rect x="-90" y="-12" width="180" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="0" y="4" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                Zone E (South Perimeter)
              </text>
            </g>
            <g transform="translate(195, 515)">
              <rect x="-65" y="-12" width="130" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="0" y="4" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                Zone F (West Wing)
              </text>
            </g>
          </g>
        )}

        {/* ─── LAYER: Verified Camera Coverage Sectors (Only for CAM-01, CAM-02, CAM-03) ─── */}
        {layerVisibility.coverage && (
          <g className="camera-coverage-layer" pointerEvents="none">
            {/* CAM-01 Entry Gate Coverage Sector */}
            <path
              d="M 1105 60 L 980 250 L 1230 250 Z"
              fill="url(#coverageGlow)"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {/* CAM-02 Bay Cluster Coverage Sector */}
            <path
              d="M 1225 610 L 1050 480 L 1050 740 Z"
              fill="url(#coverageGlow)"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {/* CAM-03 Southeast Corridor / Exit Coverage Sector */}
            <path
              d="M 1225 1318 L 1050 1190 L 1050 1446 Z"
              fill="url(#coverageGlow)"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </g>
        )}

        {/* ─── LAYER: Canonical Focused Demo Parking Zone Boundary (SP-01 to SP-20) ─ */}
        {(() => {
          const fList = Object.values(sharedDemoSpaces);
          const fOcc = fList.filter((s) => s.status === "OCCUPIED" || s.status === "VIOLATION").length;
          const fAvail = fList.filter((s) => s.status === "AVAILABLE").length;
          const fDesig = fList.filter((s) => s.status === "DESIGNATED").length;
          const fRes = fList.filter((s) => s.status === "RESERVED").length;
          const fViol = fList.filter((s) => s.status === "VIOLATION").length > 0;
          return (
            <g className="focused-demo-zone-layer" pointerEvents="none">
              {/* Outer boundary — thin, professional border framing exactly SP-01 to SP-20 */}
              <path
                d={FOCUSED_ZONE_PATH}
                fill="rgba(56, 189, 248, 0.02)"
                stroke={fViol ? "#ef4444" : "rgba(56, 189, 248, 0.55)"}
                strokeWidth="1.5"
              />
              {/* Corner accent marks for clean architectural framing */}
              <path d="M 464 315 L 464 295 L 484 295" fill="none" stroke={fViol ? "#ef4444" : "#38bdf8"} strokeWidth="2" strokeLinecap="round" />
              <path d="M 1155 295 L 1175 295 L 1175 315" fill="none" stroke={fViol ? "#ef4444" : "#38bdf8"} strokeWidth="2" strokeLinecap="round" />
              <path d="M 464 553 L 464 573 L 484 573" fill="none" stroke={fViol ? "#ef4444" : "#38bdf8"} strokeWidth="2" strokeLinecap="round" />
              <path d="M 1155 573 L 1175 573 L 1175 553" fill="none" stroke={fViol ? "#ef4444" : "#38bdf8"} strokeWidth="2" strokeLinecap="round" />

              {/* Zone Status Badge — placed ABOVE boundary in open margin (Top Aisle) */}
              <g transform="translate(470, 264)">
                <rect x="0" y="0" width="285" height="24" rx="4" fill="#040d1a" stroke={fViol ? "#ef4444" : "#38bdf8"} strokeWidth="1.2" opacity="0.95" />
                <circle cx="12" cy="12" r="3.5" fill={fViol ? "#ef4444" : "#38bdf8"} />
                <text x="22" y="15.5" fill={fViol ? "#fca5a5" : "#38bdf8"} fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                  FOCUSED DEMO ZONE · ISLAND 1 (20 SPACES)
                </text>
              </g>

              {/* Row & Aisle Readability Annotations (Subtle architectural cues) */}
              <text x="610" y="322" fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="bold" letterSpacing="0.05em">
                NORTH ROW · 8 STALLS (SP-01 – SP-08)
              </text>
              <text x="610" y="558" fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="bold" letterSpacing="0.05em">
                SOUTH ROW · 8 STALLS (SP-09 – SP-16)
              </text>
              <text x="480" y="322" fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="bold" letterSpacing="0.05em">
                WEST END · 4 STALLS (SP-17 – SP-20)
              </text>

              {/* Live Focused Zone KPI Strip — beside title badge */}
              <g transform="translate(770, 264)">
                <rect x="0" y="0" width="310" height="24" rx="4" fill="#040d1a" stroke="rgba(56,189,248,0.4)" strokeWidth="1" opacity="0.95" />
                <text x="10" y="15.5" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  <tspan fill="#94a3b8">OCC </tspan>
                  <tspan fill="#f1f5f9">{fOcc}</tspan>
                  <tspan fill="#475569">  ·  </tspan>
                  <tspan fill="#6ee7b7">AVAIL </tspan>
                  <tspan fill="#34d399">{fAvail}</tspan>
                  <tspan fill="#475569">  ·  </tspan>
                  <tspan fill="#7dd3fc">DESIG </tspan>
                  <tspan fill="#38bdf8">{fDesig}</tspan>
                  {fRes > 0 && (
                    <>
                      <tspan fill="#475569">  ·  </tspan>
                      <tspan fill="#fcd34d">RES </tspan>
                      <tspan fill="#f59e0b">{fRes}</tspan>
                    </>
                  )}
                  {fViol && (
                    <>
                      <tspan fill="#475569">  ·  </tspan>
                      <tspan fill="#fca5a5">⚠ VIOLATION</tspan>
                    </>
                  )}
                </text>
              </g>
            </g>
          );
        })()}

        {/* ─── LAYER 4: 60 Parking Bays (Focused Zone 20 Bays + Background Bays) ──────── */}
        {layerVisibility.parking && (
          <g className="parking-spaces-layer">
            {spaces.map((space) => {
              const isFocused = (FOCUSED_ZONE_SPACE_IDS as readonly string[]).includes(space.id);
              const focusedSpace = isFocused ? sharedDemoSpaces[space.id] : null;

              const isSelected = space.id === selectedSlotId;
              const isAssigned = space.id === highlightSlotId;

              // Operational states
              const isOccupied = focusedSpace ? focusedSpace.status === "OCCUPIED" : space.isOccupied;
              const isViolation = focusedSpace ? focusedSpace.status === "VIOLATION" : false;
              const isDesignated = focusedSpace ? focusedSpace.status === "DESIGNATED" : false;
              const isReserved = focusedSpace ? focusedSpace.status === "RESERVED" : isSlotReserved(space);

              // Visual Language:
              // Violation: Red accent border & floor tint with red ping
              // Designated: Cyan/blue border & subtle tint with star icon
              // Reserved: Amber accent border & floor tint
              // Available: Subtle green accent border & floor tint
              // Occupied: Neutral / dim boundary marking
              // Visual Language:
              // Focused zone: crisp operational status (Available emerald, Designated cyan, Reserved amber, Violation red)
              // Background stalls: subtle quiet architectural stalls (zero neon glow, zero distraction)
              let fillColor = "#090e18";
              let strokeColor = "#1e293b";
              let strokeWidth = 1.0;

              if (isFocused) {
                if (isViolation) {
                  fillColor = "rgba(239, 68, 68, 0.22)";
                  strokeColor = "#ef4444";
                  strokeWidth = 2.5;
                } else if (isDesignated) {
                  fillColor = "rgba(14, 165, 233, 0.12)";
                  strokeColor = "#38bdf8";
                  strokeWidth = 2.0;
                } else if (isReserved) {
                  fillColor = "rgba(245, 158, 11, 0.15)";
                  strokeColor = "#f59e0b";
                  strokeWidth = 2.0;
                } else if (isOccupied) {
                  fillColor = "#0b1220";
                  strokeColor = "#334155";
                  strokeWidth = 1.2;
                } else {
                  // Focused Available (SP-11, SP-14, SP-17, SP-19)
                  fillColor = "rgba(16, 185, 129, 0.08)";
                  strokeColor = "#10b981";
                  strokeWidth = 1.6;
                }
              } else {
                // Background stalls outside focused demo zone (SP-21 to SP-60)
                fillColor = "#0b1220";
                strokeColor = "#334155";
                strokeWidth = 1.0;
              }

              if (isSelected) {
                strokeColor = isViolation ? "#ef4444" : "#38bdf8";
                strokeWidth = 2.5;
              } else if (isAssigned) {
                fillColor = "rgba(168, 85, 247, 0.2)";
                strokeColor = "#c084fc";
                strokeWidth = 2.0;
              }

              return (
                <g
                  key={space.id}
                  className="cursor-pointer transition-all duration-150 group"
                  onClick={() => {
                    selectSlot(space.id);
                    selectSharedSpace(space.id);
                    onSlotSelect?.(space.id);
                  }}
                  onMouseEnter={() => setHoveredSlotId(space.id)}
                  onMouseLeave={() => setHoveredSlotId(null)}
                >
                  {/* Animated Ping Target for Selected, Assigned, or Violation */}
                  {isSelected && (
                    <circle
                      cx={space.x}
                      cy={space.y}
                      r="22"
                      fill="none"
                      stroke={isViolation ? "#ef4444" : "#38bdf8"}
                      strokeWidth="2.5"
                      className="animate-ping opacity-60"
                      pointerEvents="none"
                    />
                  )}
                  {isViolation && !isSelected && (
                    <circle
                      cx={space.x}
                      cy={space.y}
                      r="22"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      className="animate-ping opacity-45"
                      pointerEvents="none"
                    />
                  )}
                  {isAssigned && (
                    <circle
                      cx={space.x}
                      cy={space.y}
                      r="24"
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="2.5"
                      className="animate-ping opacity-60"
                      pointerEvents="none"
                    />
                  )}

                  {/* Parking Bay Box */}
                  <rect
                    x={space.x - space.width / 2}
                    y={space.y - space.height / 2}
                    width={space.width}
                    height={space.height}
                    rx="3"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={!isFocused ? "4 4" : undefined}
                    opacity={!isFocused ? 0.65 : 1.0}
                  />

                  {/* Space Identifier / Status Badge */}
                  {isFocused ? (
                    isViolation ? (
                      <g transform={`translate(${space.x}, ${space.y - space.height / 2 + 10})`} pointerEvents="none">
                        <rect x="-24" y="-7" width="48" height="14" rx="3" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
                        <text x="0" y="3.5" fill="#fca5a5" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                          VIOLATION
                        </text>
                      </g>
                    ) : isDesignated ? (
                      <g transform={`translate(${space.x}, ${space.y})`} pointerEvents="none">
                        <rect x="-26" y="-8" width="52" height="16" rx="3" fill="#082f49" stroke="#38bdf8" strokeWidth="1.2" />
                        <text x="0" y="3.5" fill="#38bdf8" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                          ★ {space.name}
                        </text>
                      </g>
                    ) : isReserved ? (
                      <g transform={`translate(${space.x}, ${space.y})`} pointerEvents="none">
                        <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" />
                        <text x="0" y="3.5" fill="#fcd34d" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                          RESERVED
                        </text>
                      </g>
                    ) : !isOccupied ? (
                      <g transform={`translate(${space.x}, ${space.y})`} pointerEvents="none">
                        <rect
                          x="-16"
                          y="-8"
                          width="32"
                          height="16"
                          rx="3"
                          fill={isAssigned ? "#3b0764" : isSelected ? "#082f49" : "#022c22"}
                          stroke={isAssigned ? "#c084fc" : isSelected ? "#38bdf8" : "#10b981"}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3.5"
                          fill={isAssigned ? "#f3e8ff" : isSelected ? "#38bdf8" : "#a7f3d0"}
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {space.name}
                        </text>
                      </g>
                    ) : (
                      /* Compact Stall ID at stall head when occupied */
                      <g transform={`translate(${space.x}, ${space.y - space.height / 2 + 9})`} pointerEvents="none">
                        <text
                          x="0"
                          y="0"
                          fill="#64748b"
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                          opacity={0.8}
                        >
                          {space.name}
                        </text>
                      </g>
                    )
                  ) : (
                    /* Background Space: quiet stall head ID */
                    <g transform={`translate(${space.x}, ${space.y - space.height / 2 + 8})`} pointerEvents="none">
                      <text
                        x="0"
                        y="0"
                        fill="#475569"
                        fontSize="6.5"
                        fontFamily="monospace"
                        textAnchor="middle"
                        opacity={0.6}
                      >
                        {space.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* ─── LAYER 5: Active Vehicle Route Overlay ──────────────────────────── */}
        {showAdminRoutes && layerVisibility.routes && startNode && endNode && (
          <g className="active-route-layer">
            <polyline
              points={routePoints.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeDasharray="14 8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="active-route-animated"
              filter="url(#glow-blue)"
            />
            {/* Start Node */}
            <circle
              cx={startNode[0]}
              cy={startNode[1]}
              r="7"
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="2"
            />
            {/* End Node (Target Bay) */}
            <circle
              cx={endNode[0]}
              cy={endNode[1]}
              r="8"
              fill="#10b981"
              stroke="#0f172a"
              strokeWidth="2"
            />
          </g>
        )}

        {/* ─── LAYER 6: Vehicles (Focused Zone Authoritative 1:1 + Background Vehicles) ── */}
        {showAdminVehicles && layerVisibility.vehicles && (
          <g className="vehicles-layer">
            {/* 1. Authoritative Focused Zone Vehicles (SP-01 to SP-20: strictly centered, zero overlap) */}
            {FOCUSED_ZONE_SPACE_IDS.map((spId) => {
              const fSpace = sharedDemoSpaces[spId];
              if (!fSpace) return null;

              // Only OCCUPIED or VIOLATION bays render a vehicle
              if (fSpace.status !== "OCCUPIED" && fSpace.status !== "VIOLATION") {
                return null;
              }

              const isViol = fSpace.status === "VIOLATION";
              const isSelected = selectedSlotId === spId || (isViol && selectedVehicleId === "VEH-001");
              const isHovered = hoveredSlotId === spId || hoveredVehicleId === (fSpace.vehicleId ?? "");
              const vehColor = isViol ? "#ef4444" : (fSpace.color ?? "#10b981");

              return (
                <g
                  key={`focused-car-${spId}`}
                  className="cursor-pointer transition-transform duration-75"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectSlot(spId);
                    selectSharedSpace(spId);
                    if (fSpace.vehicleId) {
                      selectVehicle(fSpace.vehicleId);
                      onVehicleSelect?.(fSpace.vehicleId);
                    }
                  }}
                  onMouseEnter={() => {
                    setHoveredSlotId(spId);
                    if (fSpace.vehicleId) setHoveredVehicleId(fSpace.vehicleId);
                  }}
                  onMouseLeave={() => {
                    setHoveredSlotId(null);
                    setHoveredVehicleId(null);
                  }}
                >
                  {/* If Violation, Red Pulsing Ring */}
                  {isViol && (
                    <circle
                      cx={fSpace.x}
                      cy={fSpace.y}
                      r="26"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      className="animate-ping opacity-60"
                      pointerEvents="none"
                    />
                  )}

                  {/* Volumetric Vehicle (Single centered car, strictly aligned to vertical stall) */}
                  {(() => {
                    const isHoriz = fSpace.width > fSpace.height;
                    const isNorthRow = spId <= "SP-08";
                    const carHeading = isHoriz ? -90 : isNorthRow ? 0 : 180;
                    const badgeOffsetY = isHoriz ? -28 : isNorthRow ? -32 : 32;
                    return (
                      <>
                        <CadCarSymbol
                          x={fSpace.x}
                          y={fSpace.y}
                          heading={carHeading}
                          scale={0.76}
                          color={vehColor}
                          isSelected={isSelected}
                        />

                        {/* Plate Badge (Shown on hover or selection, or persistent for violation) */}
                        {(isSelected || isHovered || isViol) && (
                          <g transform={`translate(${fSpace.x}, ${fSpace.y + badgeOffsetY})`}>
                            <rect
                              x="-26"
                              y="-7"
                              width="52"
                              height="14"
                              rx="3"
                              fill={isViol ? "#450a0a" : "#0f172a"}
                              stroke={isViol ? "#ef4444" : isSelected ? "#38bdf8" : vehColor}
                              strokeWidth="1.2"
                            />
                            <text
                              x="0"
                              y="3.5"
                              fill={isViol ? "#fca5a5" : isSelected ? "#38bdf8" : "#f8fafc"}
                              fontSize="7.5"
                              fontFamily="monospace"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {isViol ? "VEH-001 [VIOL]" : fSpace.vehicleId ?? fSpace.plate}
                            </text>
                          </g>
                        )}
                      </>
                    );
                  })()}
                </g>
              );
            })}

            {/* 2. Background Facility Vehicles (All 40 operational background stalls SP-21 to SP-60) */}
            {spaces
              .filter((sp) => !(FOCUSED_ZONE_SPACE_IDS as readonly string[]).includes(sp.id))
              .map((sp, idx) => {
                const isSelected = selectedSlotId === sp.id;
                const isHovered = hoveredSlotId === sp.id;
                const vehColor = idx % 2 === 0 ? "#10b981" : "#ef4444";
                // Island 1 South row (SP-22..29) faces South (180 deg), others face North (0 deg)
                const isSouthFacing = sp.y > 450 && sp.y < 600;
                const heading = isSouthFacing ? 180 : 0;
                const badgeOffsetY = isSouthFacing ? 32 : -32;

                return (
                  <g
                    key={`bg-car-${sp.id}`}
                    className="cursor-pointer transition-transform duration-75"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectSlot(sp.id);
                      selectSharedSpace(sp.id);
                      onSlotSelect?.(sp.id);
                    }}
                    onMouseEnter={() => setHoveredSlotId(sp.id)}
                    onMouseLeave={() => setHoveredSlotId(null)}
                  >
                    <CadCarSymbol
                      x={sp.x}
                      y={sp.y}
                      heading={heading}
                      scale={0.76}
                      color={vehColor}
                      isSelected={isSelected}
                    />

                    {(isSelected || isHovered) && (
                      <g transform={`translate(${sp.x}, ${sp.y + badgeOffsetY})`}>
                        <rect
                          x="-24"
                          y="-7"
                          width="48"
                          height="14"
                          rx="3"
                          fill="#0f172a"
                          stroke={isSelected ? "#38bdf8" : vehColor}
                          strokeWidth="1.2"
                        />
                        <text
                          x="0"
                          y="3.5"
                          fill={isSelected ? "#38bdf8" : "#f8fafc"}
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {sp.id}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

            {/* 3. Dynamic Moving Vehicles on Aisle Routes */}
            {vehicles
              .filter(
                (v) =>
                  (v.state === "ENTERING" || v.state === "EXITING") &&
                  v.currentPosition !== null
              )
              .map((veh) => {
                const [vx, vy] = veh.currentPosition!;
                const isSelected = veh.id === selectedVehicleId;
                const vehColor =
                  veh.color === "#ef4444" ||
                  veh.color === "#dc2626" ||
                  veh.color.includes("red")
                    ? "#ef4444"
                    : "#10b981";

                return (
                  <g
                    key={`moving-veh-${veh.id}`}
                    className="cursor-pointer transition-transform duration-75"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectVehicle(veh.id);
                      onVehicleSelect?.(veh.id);
                    }}
                  >
                    <CadCarSymbol
                      x={vx}
                      y={vy}
                      heading={veh.currentHeading + 90}
                      scale={0.78}
                      color={vehColor}
                      isSelected={isSelected}
                    />
                    <g transform={`translate(${vx}, ${vy}) rotate(${veh.currentHeading})`}>
                      <polygon points="18,-7 85,-26 85,26 18,7" fill="url(#headlightBeam)" className="car-beam-animated" />
                      <circle cx="0" cy="0" r="18" fill="none" stroke="#fef08a" strokeWidth="1.5" className="animate-ping opacity-40" />
                    </g>
                  </g>
                );
              })}
          </g>
        )}

        {/* ─── LAYER 7: 16 Cameras Clean Point Badges (No Invented FOV Cones) ── */}
        {layerVisibility.cameras && (
          <g className="cameras-layer">
            {cameras.map((cam) => {
              const isSelected = cam.id === selectedCameraId;
              const isEntry = cam.role === "ENTRY";
              const isExit = cam.role === "EXIT";
              const borderColor = isEntry ? "#10b981" : isExit ? "#f59e0b" : "#3b82f6";

              return (
                <g
                  key={cam.id}
                  transform={`translate(${cam.x}, ${cam.y})`}
                  className="cursor-pointer group"
                  onClick={() => {
                    selectCamera(cam.id);
                    onCameraSelect?.(cam.id);
                  }}
                >
                  {/* Clean Camera Marker Circle */}
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill="#0f172a"
                    stroke={isSelected ? "#38bdf8" : borderColor}
                    strokeWidth={isSelected ? 3 : 2}
                    filter={isSelected ? "url(#glow-blue)" : undefined}
                  />

                  {/* Camera Icon Dot */}
                  <circle cx="0" cy="0" r="4" fill={borderColor} />

                  {/* Camera Label Pill */}
                  <g transform="translate(0, 20)">
                    <rect
                      x="-28"
                      y="-7"
                      width="56"
                      height="15"
                      rx="3"
                      fill="#0f172a"
                      stroke={borderColor}
                      strokeWidth="1"
                      opacity="0.95"
                    />
                    <text
                      x="0"
                      y="4"
                      fill="#f8fafc"
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {cam.id}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        )}

        {/* ─── LAYER 8: ACCESS_POINT_B2 Physical Gateway Marker ────────────────── */}
        <g transform={`translate(${ACCESS_POINT_B2.x}, ${ACCESS_POINT_B2.y})`} className="access-point-layer">
          <circle cx="0" cy="0" r="16" fill="none" stroke="#38bdf8" strokeWidth="2.5" className="animate-ping opacity-40" />
          <circle cx="0" cy="0" r="9" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
          <g transform="translate(0, -22)">
            <rect x="-56" y="-8" width="112" height="17" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="0" y="4.5" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              ACCESS_POINT_B2
            </text>
          </g>
        </g>

        {/* ─── LAYER 9: Interactive Hover Tooltip ──────────────────────────────── */}
        {hoveredSlotId && (() => {
          const hoveredSpace = spaces.find((s) => s.id === hoveredSlotId);
          if (!hoveredSpace) return null;

          const tooltipW = 140;
          const tooltipH = 68;
          // Offset tooltip above slot; clamp inside SVG bounds
          const tipX = Math.max(tooltipW / 2 + 10, Math.min(1000 - tooltipW / 2 - 10, hoveredSpace.x));
          const tipY = Math.max(tooltipH + 10, hoveredSpace.y - hoveredSpace.height / 2 - 12);

          return (
            <g transform={`translate(${tipX}, ${tipY})`} pointerEvents="none" className="transition-all duration-150">
              {/* Drop shadow & background card */}
              <rect
                x={-tooltipW / 2}
                y={-tooltipH}
                width={tooltipW}
                height={tooltipH}
                rx="6"
                fill="#0b1329"
                stroke={hoveredSpace.isOccupied ? "#475569" : "#10b981"}
                strokeWidth="1.5"
                filter="url(#glow-blue)"
              />
              {/* Little anchor triangle */}
              <polygon
                points="-6,0 6,0 0,6"
                fill="#0b1329"
                stroke={hoveredSpace.isOccupied ? "#475569" : "#10b981"}
                strokeWidth="1.5"
              />
              <line x1="-5" y1="0" x2="5" y2="0" stroke="#0b1329" strokeWidth="2" />

              {/* Slot Header */}
              <text x={-tooltipW / 2 + 10} y={-tooltipH + 18} fill="#f8fafc" fontSize="11" fontFamily="monospace" fontWeight="bold">
                {hoveredSpace.name}
              </text>
              <text x={tooltipW / 2 - 10} y={-tooltipH + 18} fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">
                {hoveredSpace.zone}
              </text>

              {/* Status Badge */}
              <circle
                cx={-tooltipW / 2 + 14}
                cy={-tooltipH + 34}
                r="4"
                fill={hoveredSpace.isOccupied ? "#94a3b8" : "#10b981"}
              />
              <text
                x={-tooltipW / 2 + 24}
                y={-tooltipH + 37}
                fill={hoveredSpace.isOccupied ? "#cbd5e1" : "#34d399"}
                fontSize="10"
                fontFamily="sans-serif"
                fontWeight="600"
              >
                {hoveredSpace.isOccupied ? "OCCUPIED" : "AVAILABLE"}
              </text>

              {/* Occupant or Rate */}
              <text
                x={-tooltipW / 2 + 10}
                y={-tooltipH + 54}
                fill="#cbd5e1"
                fontSize="9"
                fontFamily="monospace"
              >
                {hoveredSpace.isOccupied
                  ? `Car: ${hoveredSpace.currentVehicleId || hoveredSpace.currentPlate || "Parked"}`
                  : "Rate: $3.50/hr"}
              </text>
            </g>
          );
        })()}

        {/* ─── Driver Overlay Children (RouteLayer, VehicleMarker, DestinationMarker) ── */}
        {children}
      </svg>

      {/* ─── Bottom-Right Live Quick Legend Bar ──────────────────────────── */}
      <div className="absolute bottom-3 right-3 z-10 hidden sm:flex items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 backdrop-blur-md shadow-lg pointer-events-none text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          <span className="text-slate-300">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span className="text-slate-300">Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
          <span className="text-slate-300">Reserved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
          <span className="text-slate-300">Selected</span>
        </div>
      </div>
    </div>
  );
}