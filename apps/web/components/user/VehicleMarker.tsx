"use client";

import React from "react";

interface VehicleMarkerProps {
  x: number;
  y: number;
  heading?: number;
  color?: string;
  vehicleId?: string;
  isMoving?: boolean;
}

/**
 * VehicleMarker: Highlights the driver's current position on the Digital Twin.
 * Displays vehicle shape, heading, pulsing locator beacon, and "YOU" badge.
 */
export function VehicleMarker({
  x,
  y,
  heading = 0,
  color = "#3b82f6",
  vehicleId: _vehicleId = "VEH-001",
  isMoving = false,
}: VehicleMarkerProps) {
  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-none select-none">
      {/* Pulsing Locator Beacon */}
      <circle
        cx="0"
        cy="0"
        r="22"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2"
        className="animate-ping opacity-60"
        style={{ animationDuration: "2.5s" }}
      />
      <circle
        cx="0"
        cy="0"
        r="14"
        fill="rgba(56, 189, 248, 0.25)"
        stroke="#38bdf8"
        strokeWidth="1.5"
      />

      {/* Rotated Vehicle Body */}
      <g transform={`rotate(${heading})`}>
        {/* Chassis */}
        <rect
          x="-18"
          y="-10"
          width="36"
          height="20"
          rx="4"
          fill={color}
          stroke="#ffffff"
          strokeWidth="2"
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
        />
        {/* Windshield */}
        <rect x="4" y="-7" width="6" height="14" rx="1.5" fill="#0f172a" opacity="0.85" />
        {/* Rear window */}
        <rect x="-12" y="-7" width="4" height="14" rx="1.5" fill="#0f172a" opacity="0.85" />

        {/* Headlight beams if moving */}
        {isMoving && (
          <>
            <polygon points="18,-7 34,-12 34,-2 18,-4" fill="rgba(254, 240, 138, 0.45)" />
            <polygon points="18,4 34,2 34,12 18,7" fill="rgba(254, 240, 138, 0.45)" />
          </>
        )}
      </g>

      {/* Floating "YOU" / Vehicle ID Pill (always upright) */}
      <g transform="translate(0, -28)">
        <rect
          x="-28"
          y="-10"
          width="56"
          height="20"
          rx="5"
          fill="#0284c7"
          stroke="#ffffff"
          strokeWidth="1.5"
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
        />
        <text
          x="0"
          y="4"
          fill="#ffffff"
          fontSize="9.5"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
          ● YOU
        </text>
      </g>
    </g>
  );
}
