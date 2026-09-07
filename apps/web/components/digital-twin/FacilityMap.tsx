"use client";

import React, { useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import {
  FACILITY_SVG_GEOMETRY,
  ACCESS_POINT_B2,
} from "./demoScenarioData";

export interface FacilityMapProps {
  onSlotSelect?: (slotId: string) => void;
  onVehicleSelect?: (vehicleId: string) => void;
  onCameraSelect?: (cameraId: string) => void;
}

export function FacilityMap({
  onSlotSelect,
  onVehicleSelect,
  onCameraSelect,
}: FacilityMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Zustand Store bindings
  const spaces = useDemoMovieStore((s) => s.spaces);
  const vehicles = useDemoMovieStore((s) => s.vehicles);
  const cameras = useDemoMovieStore((s) => s.cameras);
  const selectedVehicleId = useDemoMovieStore((s) => s.selectedVehicleId);
  const selectedSlotId = useDemoMovieStore((s) => s.selectedSlotId);
  const selectedCameraId = useDemoMovieStore((s) => s.selectedCameraId);
  const layerVisibility = useDemoMovieStore((s) => s.layerVisibility);
  const selectVehicle = useDemoMovieStore((s) => s.selectVehicle);
  const selectSlot = useDemoMovieStore((s) => s.selectSlot);
  const selectCamera = useDemoMovieStore((s) => s.selectCamera);
  const toggleLayer = useDemoMovieStore((s) => s.toggleLayer);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(1)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)));
  const handleResetZoomPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
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
    <div className="relative w-full h-full min-h-[640px] rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden select-none shadow-2xl flex flex-col">
      {/* ─── Top Floating Controls Bar ────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Layer Toggles */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900/90 p-1 backdrop-blur-md shadow-lg">
          <Button
            variant={layerVisibility.parking ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs font-mono uppercase tracking-wider"
            onClick={() => toggleLayer("parking")}
          >
            Parking
          </Button>
          <Button
            variant={layerVisibility.vehicles ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs font-mono uppercase tracking-wider"
            onClick={() => toggleLayer("vehicles")}
          >
            Vehicles
          </Button>
          <Button
            variant={layerVisibility.cameras ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs font-mono uppercase tracking-wider"
            onClick={() => toggleLayer("cameras")}
          >
            Cameras
          </Button>
          <Button
            variant={layerVisibility.routes ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs font-mono uppercase tracking-wider"
            onClick={() => toggleLayer("routes")}
          >
            Routes
          </Button>
          <Button
            variant={layerVisibility.zones ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs font-mono uppercase tracking-wider"
            onClick={() => toggleLayer("zones")}
          >
            Zones
          </Button>
        </div>

        {/* Zoom & Pan Controls */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900/90 p-1 backdrop-blur-md shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-300 hover:text-white"
            onClick={handleResetZoomPan}
            title="Fit to Viewport"
          >
            FIT
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-white"
            onClick={handleZoomIn}
            title="Zoom In (+)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-white"
            onClick={handleZoomOut}
            title="Zoom Out (−)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-white"
            onClick={handleResetZoomPan}
            title="Reset View"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <span className="px-1.5 text-[10px] font-mono font-medium text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Facility Header Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 backdrop-blur-md shadow-lg pointer-events-none">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold text-slate-200">Carparking-01 B2</span>
        <span className="text-[10px] font-mono text-slate-400 border-l border-slate-700 pl-2">
          60 Operational Spaces · 16 Verified Cameras
        </span>
      </div>

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
        </defs>

        {/* ─── LAYER 1: Background & Facility Outer Boundary ──────────────────── */}
        <rect width="1472" height="1508" fill="#070b14" />
        <rect width="1472" height="1508" fill="url(#twinGrid)" />

        {/* L-Shaped Building Floor */}
        <path
          d={FACILITY_SVG_GEOMETRY.outerBoundary}
          fill="#0c1322"
          stroke="#1e293b"
          strokeWidth="6"
        />

        {/* Outer Perimeter Wall Highlight */}
        <path
          d={FACILITY_SVG_GEOMETRY.outerBoundary}
          fill="none"
          stroke="#334155"
          strokeWidth="3"
        />

        {/* ─── LAYER 2: Drive Aisles (Clean Brown Roadway Polygons) ───────────── */}
        {layerVisibility.routes && (
          <g className="drive-aisles-layer">
            {FACILITY_SVG_GEOMETRY.driveAisles.map((aisle) => (
              <path
                key={aisle.id}
                d={aisle.d}
                fill="#2c1e15"
                stroke="#3f2b1d"
                strokeWidth="2"
              />
            ))}

            {/* Lane Centerlines */}
            <line x1="1135" y1="180" x2="1135" y2="1260" stroke="#785b3f" strokeWidth="2.5" strokeDasharray="12 8" />
            <line x1="160" y1="180" x2="1060" y2="180" stroke="#785b3f" strokeWidth="2" strokeDasharray="10 8" />
            <line x1="480" y1="500" x2="1060" y2="500" stroke="#785b3f" strokeWidth="2" strokeDasharray="10 8" />
            <line x1="380" y1="1105" x2="1060" y2="1105" stroke="#785b3f" strokeWidth="2.5" strokeDasharray="12 8" />
            <line x1="505" y1="210" x2="505" y2="1130" stroke="#785b3f" strokeWidth="2" strokeDasharray="10 8" />
          </g>
        )}

        {/* ─── LAYER 3: Structural Cores, Lift Cores & Services ───────────────── */}
        {layerVisibility.zones && (
          <g className="structural-cores-layer">
            {FACILITY_SVG_GEOMETRY.structuralCores.map((core) => (
              <g key={core.id}>
                <rect
                  x={core.x}
                  y={core.y}
                  width={core.w}
                  height={core.h}
                  fill={core.id.includes("ramp") ? "url(#rampVoidHatch)" : "url(#structuralHatch)"}
                  stroke={core.id.includes("ramp") ? "#e11d48" : "#475569"}
                  strokeWidth="2"
                  rx="4"
                />
                <text
                  x={core.x + core.w / 2}
                  y={core.y + core.h / 2 + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {core.name}
                </text>
              </g>
            ))}
          </g>
        )}

        {/* ─── LAYER 4: 60 Parking Bays (RED Available / GREEN Occupied) ──────── */}
        {layerVisibility.parking && (
          <g className="parking-spaces-layer">
            {spaces.map((space) => {
              const isSelected = space.id === selectedSlotId;
              const isOccupied = space.isOccupied;

              // Presentation Colors: GREEN = OCCUPIED, RED = AVAILABLE
              const fillColor = isOccupied ? "rgba(16, 185, 129, 0.18)" : "rgba(239, 68, 68, 0.12)";
              const strokeColor = isSelected
                ? "#38bdf8"
                : isOccupied
                ? "#10b981"
                : "#ef4444";
              const strokeWidth = isSelected ? 3 : isOccupied ? 2 : 1.5;

              return (
                <g
                  key={space.id}
                  className="cursor-pointer transition-all duration-150 group"
                  onClick={() => {
                    selectSlot(space.id);
                    onSlotSelect?.(space.id);
                  }}
                >
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
                    filter={isSelected ? "url(#glow-blue)" : isOccupied ? "url(#glow-green)" : undefined}
                  />

                  {/* Status Indicator Dot */}
                  <circle
                    cx={space.x}
                    cy={space.y - space.height / 2 + 10}
                    r="4"
                    fill={isOccupied ? "#10b981" : "#ef4444"}
                  />

                  {/* Space Label */}
                  <text
                    x={space.x}
                    y={space.y + 3}
                    fill={isSelected ? "#38bdf8" : isOccupied ? "#a7f3d0" : "#fca5a5"}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {space.name}
                  </text>

                  {/* Tiny Plate Label if Occupied */}
                  {isOccupied && space.currentPlate && (
                    <text
                      x={space.x}
                      y={space.y + 14}
                      fill="#34d399"
                      fontSize="7"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {space.currentPlate}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* ─── LAYER 5: Active Vehicle Route Overlay ──────────────────────────── */}
        {layerVisibility.routes && startNode && endNode && (
          <g className="active-route-layer">
            <polyline
              points={routePoints.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeDasharray="10 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse"
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

        {/* ─── LAYER 6: Vehicles (Type A Moving & Type B Parked) ──────────────── */}
        {layerVisibility.vehicles && (
          <g className="vehicles-layer">
            {vehicles.map((veh) => {
              if (veh.state === "UPCOMING" || veh.state === "EXITED" || !veh.currentPosition) {
                return null;
              }

              const [vx, vy] = veh.currentPosition;
              const isSelected = veh.id === selectedVehicleId;

              return (
                <g
                  key={veh.id}
                  transform={`translate(${vx}, ${vy}) rotate(${veh.currentHeading})`}
                  className="cursor-pointer transition-transform duration-75"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectVehicle(veh.id);
                    onVehicleSelect?.(veh.id);
                  }}
                >
                  {/* Vehicle Body Rectangle */}
                  <rect
                    x="-18"
                    y="-10"
                    width="36"
                    height="20"
                    rx="4"
                    fill={veh.color}
                    stroke={isSelected ? "#38bdf8" : "#ffffff"}
                    strokeWidth={isSelected ? 3 : 1.5}
                    filter={isSelected ? "url(#glow-blue)" : undefined}
                  />

                  {/* Windshield */}
                  <rect x="4" y="-7" width="6" height="14" rx="1.5" fill="#0f172a" opacity="0.8" />
                  {/* Rear Window */}
                  <rect x="-12" y="-7" width="4" height="14" rx="1.5" fill="#0f172a" opacity="0.8" />

                  {/* Headlights Glow if Moving */}
                  {(veh.state === "ENTERING" || veh.state === "EXITING") && (
                    <>
                      <polygon points="18,-7 35,-12 35,-2 18,-4" fill="rgba(254, 240, 138, 0.4)" />
                      <polygon points="18,4 35,2 35,12 18,7" fill="rgba(254, 240, 138, 0.4)" />
                    </>
                  )}

                  {/* Plate Badge (Drawn unrotated relative to text orientation) */}
                  <g transform={`rotate(${-veh.currentHeading}) translate(0, -18)`}>
                    <rect
                      x="-24"
                      y="-7"
                      width="48"
                      height="14"
                      rx="3"
                      fill="#0f172a"
                      stroke={isSelected ? "#38bdf8" : "#64748b"}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3.5"
                      fill={isSelected ? "#38bdf8" : "#e2e8f0"}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {veh.plate}
                    </text>
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
      </svg>
    </div>
  );
}