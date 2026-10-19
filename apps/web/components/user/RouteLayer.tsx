"use client";

import React, { useMemo } from "react";
import { NavigationArrow, calculateRouteArrows } from "./NavigationArrow";

interface RouteLayerProps {
  points: [number, number][];
  color?: string;
  showArrows?: boolean;
}

/**
 * RouteLayer: Renders glowing polyline route over Digital Twin with directional navigation arrows.
 */
export function RouteLayer({
  points,
  color = "#38bdf8",
  showArrows = true,
}: RouteLayerProps) {
  const arrows = useMemo(() => {
    if (!points || points.length < 2) return [];
    return calculateRouteArrows(points, 65);
  }, [points]);

  if (!points || points.length < 2) return null;

  const polylineStr = points.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <g className="user-route-layer pointer-events-none select-none">
      <defs>
        <filter id="userRouteGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Wide translucent route halo */}
      <polyline
        points={polylineStr}
        fill="none"
        stroke="rgba(56, 189, 248, 0.22)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Main pulsing route line */}
      <polyline
        points={polylineStr}
        fill="none"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="12 8"
        className="animate-pulse"
        filter="url(#userRouteGlow)"
        style={{ animationDuration: "2s" }}
      />

      {/* Directional Navigation Arrows along route */}
      {showArrows &&
        arrows.map((arr, idx) => (
          <NavigationArrow
            key={`arr_${idx}`}
            x={arr.x}
            y={arr.y}
            angleDegrees={arr.angle}
            size={13}
            color={color}
          />
        ))}

      {/* Waypoint circles along corners */}
      {points.map(([x, y], idx) => (
        <circle
          key={`wpt_${idx}`}
          cx={x}
          cy={y}
          r="4"
          fill="#38bdf8"
          stroke="#0f172a"
          strokeWidth="1.5"
        />
      ))}
    </g>
  );
}
