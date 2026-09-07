"use client";

import React, { useState } from "react";
import type { TwinCameraState } from "@/types/digitalTwin";
import type { CameraGeometry } from "./facilityGeometry";

interface CameraMarkerProps {
  camera: TwinCameraState;
  geometry: CameraGeometry;
  isSelected: boolean;
  onSelect: (cameraId: string) => void;
  showFov?: boolean;
  isConfigured?: boolean;
}

export function CameraMarker({
  camera,
  geometry,
  isSelected,
  onSelect,
  showFov = true,
}: CameraMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isOnline = camera.status === "online";
  const role = camera.role || geometry.defaultRole || "UNKNOWN";

  const { x, y, angle, fov } = geometry;
  const range = fov * 2; // Default range based on FOV

  // Calculate SVG arc path for FOV cone
  const halfFov = fov / 2;
  const startRad = ((angle - halfFov) * Math.PI) / 180;
  const endRad = ((angle + halfFov) * Math.PI) / 180;

  const x1 = range * Math.cos(startRad);
  const y1 = range * Math.sin(startRad);
  const x2 = range * Math.cos(endRad);
  const y2 = range * Math.sin(endRad);

  const largeArcFlag = fov > 180 ? 1 : 0;
  const fovPath = `M 0 0 L ${x1} ${y1} A ${range} ${range} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

  // Role pill color
  const roleColor = role === "ENTRY"
    ? "#38bdf8" // Sky blue
    : role === "PARKING_LOT" || role === "PATH_PARKING"
    ? "#a855f7" // Purple
    : role === "EXIT"
    ? "#f59e0b" // Amber
    : "#94a3b8";

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(camera.camera_id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-pointer group"
      role="button"
      tabIndex={0}
      aria-label={`Camera ${camera.camera_id} (${camera.name}), Role: ${role}`}
    >
      {/* Semi-transparent FOV Coverage Cone */}
      {(showFov || isHovered || isSelected) && (
        <path
          d={fovPath}
          fill={roleColor}
          fillOpacity={isSelected ? 0.22 : isHovered ? 0.18 : 0.08}
          stroke={roleColor}
          strokeWidth={isSelected ? 1.5 : 1}
          strokeDasharray={isSelected ? "none" : "4 3"}
          strokeOpacity={isSelected ? 0.8 : 0.4}
          className="transition-all duration-300 pointer-events-none"
        />
      )}

      {/* Mounting Base & Camera Housing */}
      <circle
        cx="0"
        cy="0"
        r="14"
        fill="#0f172a"
        stroke={isSelected ? "#38bdf8" : roleColor}
        strokeWidth={isSelected ? 3 : 2}
        className="transition-transform duration-200 group-hover:scale-110"
      />

      {/* Directional Lens Pointer */}
      <g transform={`rotate(${angle})`}>
        <polygon
          points="6,-4 14,0 6,4"
          fill={roleColor}
        />
      </g>

      {/* Online Status LED dot */}
      <circle
        cx="5"
        cy="-5"
        r="3.5"
        fill={isOnline ? "#10b981" : "#ef4444"}
        stroke="#0f172a"
        strokeWidth="1"
        className={isOnline ? "animate-ping" : ""}
        style={{ animationDuration: "3s" }}
      />
      <circle
        cx="5"
        cy="-5"
        r="2.5"
        fill={isOnline ? "#10b981" : "#ef4444"}
      />

      {/* Camera Icon Symbol */}
      <path
        d="M -5 -2 L -2 -5 L 2 -5 L 5 -2 L 5 4 L -5 4 Z"
        fill={roleColor}
        transform="scale(0.8) translate(-0.5, -0.5)"
      />

      {/* Text Label: Camera ID & Role Pill */}
      <g transform="translate(0, 24)">
        <rect
          x="-36"
          y="-8"
          width="72"
          height="16"
          rx="4"
          fill="#0f172a"
          stroke={roleColor}
          strokeWidth="1"
        />
        <text
          x="0"
          y="3.5"
          fill="#f8fafc"
          fontSize="8"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          {camera.camera_id} • {role}
        </text>
      </g>
    </g>
  );
}
