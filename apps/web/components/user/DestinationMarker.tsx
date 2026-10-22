"use client";

import React from "react";
import { bayLabel } from "@/utils/bayLabel";

interface DestinationMarkerProps {
  x: number;
  y: number;
  label: string;
  type?: "parking_space" | "gateway";
  zone?: string;
}

/**
 * DestinationMarker: Prominently identifies the destination bay or gateway on the Digital Twin.
 */
export function DestinationMarker({
  x,
  y,
  label,
  type = "parking_space",
  zone: _zone,
}: DestinationMarkerProps) {
  const isGateway = type === "gateway";
  const primaryColor = isGateway ? "#38bdf8" : "#a855f7";
  const ringColor = isGateway ? "#0284c7" : "#9333ea";

  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-none select-none">
      {/* Animated Destination Ping */}
      <circle
        cx="0"
        cy="0"
        r="28"
        fill="none"
        stroke={primaryColor}
        strokeWidth="2.5"
        className="animate-ping opacity-60"
        style={{ animationDuration: "2s" }}
      />

      {/* Target Marker Circles */}
      <circle cx="0" cy="0" r="16" fill="rgba(15, 23, 42, 0.9)" stroke={primaryColor} strokeWidth="2.5" />
      <circle cx="0" cy="0" r="8" fill={ringColor} stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="0" cy="0" r="3" fill="#ffffff" />

      {/* Target Destination Label Banner */}
      <g transform="translate(0, 32)">
        <rect
          x="-50"
          y="-11"
          width="100"
          height="22"
          rx="6"
          fill="#0f172a"
          stroke={primaryColor}
          strokeWidth="1.5"
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.6))"
        />
        <text
          x="0"
          y="4"
          fill="#f8fafc"
          fontSize="9.5"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
          ★ {type === "parking_space" ? bayLabel(label) : label}
        </text>
      </g>
    </g>
  );
}
