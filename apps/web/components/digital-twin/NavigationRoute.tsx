"use client";

import React from "react";
import type { RouteData } from "@/types/digitalTwin";
import { FACILITY_NAV_NODES } from "./facilityGeometry";

interface NavigationRouteProps {
  route: RouteData;
}

export function NavigationRoute({ route }: NavigationRouteProps) {
  if (!route || !route.path || route.path.length < 2) return null;

  // Resolve waypoints from calibrated L-shaped facility nodes
  const points = route.path.map((nodeId) => {
    const upper = nodeId.toUpperCase();
    const node = FACILITY_NAV_NODES[upper];
    if (node) {
      return { x: node.x, y: node.y, id: node.id, name: node.name };
    }
    // Fallback if backend returned direct waypoints
    const fallback = route.waypoints?.find((w) => w.id.toUpperCase() === upper);
    return {
      x: fallback ? fallback.x : 500,
      y: fallback ? fallback.y : 350,
      id: nodeId,
      name: fallback?.name || nodeId,
    };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  if (!startPoint || !endPoint) return null;

  return (
    <g className="navigation-route-layer pointer-events-none">
      <defs>
        {/* Glowing gradient along route */}
        <linearGradient id="navGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.9" />
        </linearGradient>

        <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background Wide Route Halo */}
      <polyline
        points={polylineStr}
        fill="none"
        stroke="rgba(56, 189, 248, 0.25)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Main Animated Pulsing Route Line */}
      <polyline
        points={polylineStr}
        fill="none"
        stroke="url(#navGlowGradient)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="8 6"
        className="animate-pulse"
        filter="url(#routeGlow)"
        style={{
          animationDuration: "2s",
        }}
      />

      {/* Intermediate Waypoint Junction Circles */}
      {points.slice(1, -1).map((pt, idx) => (
        <circle
          key={idx}
          cx={pt.x}
          cy={pt.y}
          r="4"
          fill="#38bdf8"
          stroke="#0f172a"
          strokeWidth="1.5"
        />
      ))}

      {/* Start Waypoint (Entry) */}
      <g transform={`translate(${startPoint.x}, ${startPoint.y})`}>
        <circle cx="0" cy="0" r="10" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="0" cy="0" r="4" fill="#ffffff" />
      </g>

      {/* Destination Waypoint (Slot / Exit) */}
      <g transform={`translate(${endPoint.x}, ${endPoint.y})`}>
        <circle
          cx="0"
          cy="0"
          r="12"
          fill="#a855f7"
          stroke="#e879f9"
          strokeWidth="2.5"
          className="animate-ping"
          style={{ animationDuration: "2.5s" }}
        />
        <circle cx="0" cy="0" r="10" fill="#9333ea" stroke="#f0abfc" strokeWidth="2" />
        <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
      </g>

      {/* Floating Route Distance Pill at Destination */}
      <g transform={`translate(${endPoint.x}, ${endPoint.y - 20})`}>
        <rect
          x="-55"
          y="-9"
          width="110"
          height="18"
          rx="9"
          fill="#0f172a"
          stroke="#c084fc"
          strokeWidth="1"
        />
        <text
          x="0"
          y="3"
          fill="#f5d0fe"
          fontSize="8"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          {route.distance_meters ? `LENGTH: ${Math.round(route.distance_meters)} (UNSCALED)` : `DEST: ${route.destination}`}
        </text>
      </g>
    </g>
  );
}
