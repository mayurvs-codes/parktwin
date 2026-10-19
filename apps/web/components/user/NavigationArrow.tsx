"use client";

import React from "react";

interface NavigationArrowProps {
  x: number;
  y: number;
  angleDegrees: number;
  size?: number;
  color?: string;
}

/**
 * High-contrast directional arrow / chevron placed along Digital Twin polyline routes.
 * Indicates driving direction without mimicking Google Maps.
 */
export function NavigationArrow({
  x,
  y,
  angleDegrees,
  size = 12,
  color = "#38bdf8",
}: NavigationArrowProps) {
  const half = size / 2;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${angleDegrees})`}
      className="pointer-events-none drop-shadow-md select-none"
    >
      {/* Outer Chevron glow */}
      <polygon
        points={`-${half},-${half * 0.9} ${half * 0.9},0 -${half},${half * 0.9} -${half * 0.4},0`}
        fill={color}
        stroke="#0f172a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner highlight core */}
      <polygon
        points={`-${half * 0.6},-${half * 0.4} ${half * 0.4},0 -${half * 0.6},${half * 0.4} -${half * 0.2},0`}
        fill="#ffffff"
        opacity="0.9"
      />
    </g>
  );
}

/**
 * Calculates equidistant points and angles along a polyline for placing NavigationArrows.
 */
export function calculateRouteArrows(
  points: [number, number][],
  spacing = 70
): Array<{ x: number; y: number; angle: number }> {
  if (!points || points.length < 2) return [];

  const arrows: Array<{ x: number; y: number; angle: number }> = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dist = Math.hypot(dx, dy);

    if (dist < 15) continue; // Skip very small segments

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const count = Math.max(1, Math.floor(dist / spacing));

    for (let s = 1; s <= count; s++) {
      const t = s / (count + 1);
      arrows.push({
        x: p1[0] + dx * t,
        y: p1[1] + dy * t,
        angle,
      });
    }
  }

  return arrows;
}
