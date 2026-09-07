"use client";

import React from "react";
import type { TwinVehicleState } from "@/types/digitalTwin";

interface VehicleMarkerProps {
  vehicle: TwinVehicleState;
  x: number;
  y: number;
  orientation?: number; // 0 = facing north, 180 = south, 90 = east, 270 = west
  isSelected: boolean;
  onSelect: (vehicleId: string) => void;
}

export function VehicleMarker({
  vehicle,
  x,
  y,
  orientation = 0,
  isSelected,
  onSelect,
}: VehicleMarkerProps) {
  const isParked = vehicle.status === "parked";
  const isExiting = vehicle.status === "exiting" || vehicle.status === "exited";

  // Vehicle body color
  const bodyColor = vehicle.color?.toLowerCase() === "white"
    ? "#e2e8f0"
    : vehicle.color?.toLowerCase() === "red"
    ? "#f43f5e"
    : vehicle.color?.toLowerCase() === "black"
    ? "#1e293b"
    : vehicle.color?.toLowerCase() === "blue"
    ? "#3b82f6"
    : vehicle.color?.toLowerCase() === "grey" || vehicle.color?.toLowerCase() === "gray"
    ? "#64748b"
    : "#38bdf8";

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${orientation})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(vehicle.prototype_id || vehicle.id || vehicle.license_plate);
      }}
      className="cursor-pointer group"
      role="button"
      tabIndex={0}
      aria-label={`Vehicle ${vehicle.license_plate}, ${vehicle.brand || ""} ${vehicle.model || ""}`}
    >
      {/* Outer Selection Highlight Ring */}
      {isSelected && (
        <ellipse
          cx="0"
          cy="0"
          rx="24"
          ry="32"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeDasharray="4 3"
          className="animate-spin"
          style={{ animationDuration: "6s" }}
        />
      )}

      {/* Vehicle Shadow */}
      <ellipse
        cx="0"
        cy="2"
        rx="16"
        ry="24"
        fill="rgba(0, 0, 0, 0.45)"
      />

      {/* Vehicle Chassis SVG Silhouette */}
      <rect
        x="-14"
        y="-22"
        width="28"
        height="44"
        rx="6"
        fill={bodyColor}
        stroke={isSelected ? "#38bdf8" : "#0f172a"}
        strokeWidth="1.5"
        className="transition-transform duration-200 group-hover:scale-105"
      />

      {/* Windshield */}
      <rect
        x="-10"
        y="-12"
        width="20"
        height="7"
        rx="2"
        fill="#0f172a"
        opacity="0.8"
      />

      {/* Rear Window */}
      <rect
        x="-9"
        y="11"
        width="18"
        height="5"
        rx="1.5"
        fill="#0f172a"
        opacity="0.8"
      />

      {/* Headlights */}
      <circle cx="-9" cy="-20" r="1.5" fill="#fef08a" />
      <circle cx="9" cy="-20" r="1.5" fill="#fef08a" />

      {/* Taillights */}
      <circle cx="-9" cy="20" r="1.5" fill="#ef4444" />
      <circle cx="9" cy="20" r="1.5" fill="#ef4444" />

      {/* Side Mirrors */}
      <rect x="-16" y="-12" width="2" height="4" rx="1" fill={bodyColor} />
      <rect x="14" y="-12" width="2" height="4" rx="1" fill={bodyColor} />

      {/* Floating Status Pill (unrotated so text stays upright) */}
      <g transform={`rotate(${-orientation}) translate(0, -32)`}>
        <rect
          x="-36"
          y="-9"
          width="72"
          height="18"
          rx="9"
          fill="#0f172a"
          stroke={isSelected ? "#38bdf8" : isParked ? "#10b981" : isExiting ? "#ef4444" : "#f59e0b"}
          strokeWidth="1.5"
        />
        <text
          x="0"
          y="3"
          fill="#f8fafc"
          fontSize="8.5"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          {vehicle.license_plate}
        </text>
      </g>
    </g>
  );
}
