"use client";

import React from "react";
import type { ParkingBay3DData } from "./types";

interface Minimap2DProps {
  bays: ParkingBay3DData[];
  targetBayId: string;
  vehiclePosition: { x: number; z: number };
  vehicleAngle: number;
  isNavigating: boolean;
}

export function Minimap2D({
  bays,
  targetBayId,
  vehiclePosition,
  vehicleAngle,
}: Minimap2DProps) {
  // Map 3D coordinate space to SVG viewbox (Width: 200, Height: 100)
  // 3D X ranges roughly -20 to +16 -> maps to svg X: 15 to 185
  // 3D Z ranges roughly -8 to +6 -> maps to svg Y: 15 to 85
  const mapX = (x3d: number) => {
    return 15 + ((x3d + 20) / 36) * 170;
  };

  const mapZ = (z3d: number) => {
    return 15 + ((z3d + 8) / 14) * 70;
  };

  const vehSvgX = mapX(vehiclePosition.x);
  const vehSvgY = mapZ(vehiclePosition.z);

  // Convert vehicle angle to degrees for SVG rotation
  // Angle in Three.js is around Y axis, where forward is (sin(angle), 0, cos(angle))
  const angleDeg = (vehicleAngle * 180) / Math.PI;

  return (
    <div className="rounded-xl border border-sky-500/30 bg-slate-950/90 p-2 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between pb-1.5 px-1">
        <span className="text-[10px] font-mono font-bold tracking-widest text-sky-400 uppercase">
          ZONE C · MINIMAP
        </span>
        <span className="text-[9px] font-mono text-slate-400">
          LEVEL B2
        </span>
      </div>

      <svg viewBox="0 0 200 90" className="w-44 h-20 bg-slate-900/90 rounded-lg border border-slate-800">
        {/* Drive Aisle Strip */}
        <rect
          x="10"
          y="15"
          width="180"
          height="18"
          fill="#1e293b"
          rx="2"
        />
        {/* Dashed Centerline */}
        <line
          x1="12"
          y1="24"
          x2="188"
          y2="24"
          stroke="#475569"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        {/* Exit Gate Indicator on West */}
        <text
          x="12"
          y="12"
          fill="#34d399"
          fontSize="7"
          fontFamily="monospace"
          fontWeight="bold"
        >
          ← EXIT B2
        </text>

        {/* Parking Bays */}
        {bays.map((bay) => {
          const bx = mapX(bay.position[0]) - 6;
          const by = mapZ(bay.position[2]) - 14;
          const isTarget = bay.id === targetBayId;
          const isOccupied = bay.status === "OCCUPIED";

          return (
            <g key={bay.id}>
              <rect
                x={bx}
                y={by}
                width="12"
                height="22"
                rx="1"
                fill={isTarget ? "#0284c7" : isOccupied ? "#1e293b" : "#0f172a"}
                stroke={isTarget ? "#38bdf8" : isOccupied ? "#475569" : "#64748b"}
                strokeWidth={isTarget ? "1.5" : "0.75"}
              />
              <text
                x={bx + 6}
                y={by + 14}
                fill={isTarget ? "#ffffff" : isOccupied ? "#64748b" : "#94a3b8"}
                fontSize="5"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                {bay.id.replace("SP-", "")}
              </text>
            </g>
          );
        })}

        {/* Dynamic Car Marker */}
        <g transform={`translate(${vehSvgX}, ${vehSvgY}) rotate(${angleDeg})`}>
          {/* Pulse ring */}
          <circle r="4" fill="#38bdf8" fillOpacity="0.4" />
          {/* Arrow / Car body */}
          <polygon
            points="0,-4 3,3 0,1.5 -3,3"
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth="0.8"
          />
        </g>
      </svg>
    </div>
  );
}
