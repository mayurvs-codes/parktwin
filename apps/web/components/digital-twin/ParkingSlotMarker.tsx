"use client";

import React from "react";
import type { TwinSlotState, TwinSlotStatus } from "@/types/digitalTwin";
import { STATUS_PALETTE, type SlotGeometry } from "./facilityGeometry";

interface ParkingSlotMarkerProps {
  slot: TwinSlotState;
  geometry: SlotGeometry;
  isSelected: boolean;
  onSelect: (slotId: string) => void;
  utilizationPercent?: number;
  showHeatmap?: boolean;
  confidence?: string;
  confidenceColor?: string;
  isRuntime?: boolean;
  physicalId?: string;
}

export function ParkingSlotMarker({
  slot,
  geometry,
  isSelected,
  onSelect,
  utilizationPercent = 0,
  showHeatmap = false,
  isRuntime = false,
  physicalId,
}: ParkingSlotMarkerProps) {
  const status: TwinSlotStatus = slot.status || "free";
  const palette = STATUS_PALETTE[status];

  const { x, y, width, height, orientation, confidence } = geometry;
  const isHorizontal = orientation === 90 || orientation === 270;
  const isUnverified = confidence === "UNVERIFIED";

  // If not a runtime slot (P01-P10), show clean neutral architectural styling
  let fillColor = "rgba(15, 23, 42, 0.5)";
  let strokeColor = isUnverified ? "rgba(100, 116, 139, 0.35)" : "rgba(71, 85, 105, 0.55)";
  let strokeWidth = isSelected ? 2.5 : 1.2;

  if (isRuntime) {
    fillColor = showHeatmap
      ? `rgba(239, 68, 68, ${Math.max(0.15, utilizationPercent / 100)})`
      : palette.fill;
    strokeColor = isSelected ? "#38bdf8" : palette.stroke;
    strokeWidth = isSelected ? 2.5 : 1.5;
  } else if (isSelected) {
    strokeColor = "#38bdf8";
  }

  const displayName = isRuntime ? slot.slot_id : (physicalId || slot.slot_id);

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(slot.slot_id);
      }}
      className="cursor-pointer transition-all duration-200 group"
      role="button"
      tabIndex={0}
      aria-label={`Slot ${displayName}, ${isRuntime ? `Status: ${status}` : "Physical Bay (Not Configured)"}`}
    >
      {/* Selection outer pulse glow */}
      {isSelected && (
        <rect
          x={-4}
          y={-4}
          width={width + 8}
          height={height + 8}
          rx={7}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="animate-pulse"
        />
      )}

      {/* Main Slot Bay Box */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={4}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={!isRuntime && isUnverified ? "3 3" : undefined}
        className="transition-colors duration-200 group-hover:brightness-125"
      />

      {/* Bay Entrance Notch Marker */}
      {orientation === 180 && (
        <line
          x1={3}
          y1={height}
          x2={width - 3}
          y2={height}
          stroke="#070d19"
          strokeWidth="2.5"
        />
      )}
      {orientation === 90 && (
        <line
          x1={width}
          y1={3}
          x2={width}
          y2={height - 3}
          stroke="#070d19"
          strokeWidth="2.5"
        />
      )}

      {/* Slot ID Header Label */}
      <text
        x={width / 2}
        y={isHorizontal ? 16 : 18}
        fill={isSelected ? "#38bdf8" : isRuntime ? "#f1f5f9" : "#64748b"}
        fontSize={isRuntime ? "10" : "8"}
        fontWeight="bold"
        fontFamily="monospace"
        textAnchor="middle"
      >
        {displayName}
      </text>

      {/* Status or License Plate Badge */}
      {isRuntime ? (
        slot.license_plate ? (
          <g transform={`translate(${width / 2}, ${isHorizontal ? height - 12 : height - 16})`}>
            <rect
              x={-20}
              y={-7}
              width={40}
              height={14}
              rx={2}
              fill="#0f172a"
              stroke={palette.stroke}
              strokeWidth="1"
            />
            <text
              x={0}
              y={3}
              fill="#f8fafc"
              fontSize="7"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {slot.license_plate}
            </text>
          </g>
        ) : (
          <text
            x={width / 2}
            y={isHorizontal ? height - 10 : height - 14}
            fill={status === "free" ? "#10b981" : "#94a3b8"}
            fontSize="8"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
            className="uppercase tracking-wider"
          >
            {status === "free" ? "FREE" : status}
          </text>
        )
      ) : (
        <text
          x={width / 2}
          y={isHorizontal ? height - 10 : height - 14}
          fill={isUnverified ? "#64748b" : "#475569"}
          fontSize="6.5"
          fontWeight="medium"
          fontFamily="monospace"
          textAnchor="middle"
          className="uppercase tracking-wider"
        >
          {isUnverified ? "UNVERIFIED" : "BAY"}
        </text>
      )}

      {/* Heatmap badge if active */}
      {showHeatmap && utilizationPercent > 0 && (
        <text
          x={width - 8}
          y={14}
          fill="#f87171"
          fontSize="8"
          fontWeight="bold"
          textAnchor="end"
        >
          {utilizationPercent}%
        </text>
      )}
    </g>
  );
}
