"use client";

import React from "react";
import { ArrowUp, ArrowDown, AlertCircle, CheckCircle } from "lucide-react";

export interface AccessPointMarkerProps {
  accessPoint: {
    id: string;
    name: string;
    location: "VERIFIED" | "UNVERIFIED";
    candidates: Array<{ id: string; label: string; x: number; y: number }>;
    operationalDirections: string[];
    cameraEntry: string;
    cameraExit: string;
    verifiedCoordinates?: { x: number; y: number } | null;
  };
  onLocationVerify?: (verified: boolean, coords?: { x: number; y: number }) => void;
}

export function AccessPointMarker({ accessPoint, onLocationVerify: _onLocationVerify }: AccessPointMarkerProps) {
  const isVerified = accessPoint.location === "VERIFIED";
  const coords = accessPoint.verifiedCoordinates || accessPoint.candidates[0] || { x: 0, y: 0 };

  return (
    <g className="access-point-marker" transform={`translate(${coords.x}, ${coords.y})`}>
      {/* Pulse ring for unverified */}
      {!isVerified && (
        <circle
          cx="0"
          cy="0"
          r="24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeOpacity="0.4"
          className="pulse-ring"
          style={{ animation: "pulse 2s ease-in-out infinite" }}
        />
      )}

      {/* Main access point marker */}
      <circle
        cx="0"
        cy="0"
        r={isVerified ? 16 : 14}
        fill={isVerified ? "url(#accessPointGlow)" : "#3b82f6"}
        stroke="#38bdf8"
        strokeWidth="2"
        opacity={isVerified ? 1 : 0.8}
      />

      {/* Directional arrows */}
      <g transform="translate(0, -22)">
        <ArrowUp size={12} fill="#ffffff" stroke="#070d19" strokeWidth="2" />
        <text x="16" y="4" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
          ENTRY
        </text>
      </g>

      <g transform="translate(0, 22)">
        <ArrowDown size={12} fill="#ffffff" stroke="#070d19" strokeWidth="2" />
        <text x="16" y="4" fill="#f43f5e" fontSize="8" fontWeight="bold" fontFamily="monospace">
          EXIT
        </text>
      </g>

      {/* Status indicator */}
      {isVerified ? (
        <g transform="translate(-20, -20)">
          <CheckCircle size={14} fill="#10b981" />
        </g>
      ) : (
        <g transform="translate(-20, -20)">
          <AlertCircle size={14} fill="#f59e0b" />
        </g>
      )}

      {/* Candidate indicators (when unverified) */}
      {!isVerified && (
        <g className="candidate-markers">
          {accessPoint.candidates.map((candidate, _idx) => (
            <g key={candidate.id} transform={`translate(${candidate.x - coords.x}, ${candidate.y - coords.y})`}>
              <circle cx="0" cy="0" r="8" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
              <text x="12" y="4" fill="#3b82f6" fontSize="8" fontWeight="medium" fontFamily="monospace">
                {candidate.label}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* Camera references */}
      <g transform="translate(0, 40)">
        <text x="0" y="0" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          📷 {accessPoint.cameraEntry} / {accessPoint.cameraExit}
        </text>
      </g>

      {/* UNVERIFIED badge */}
      {!isVerified && (
        <g transform="translate(0, 55)">
          <rect x="-40" y="-8" width="80" height="18" rx="4" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" />
          <text x="0" y="4" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            LOCATION UNVERIFIED
          </text>
        </g>
      )}
    </g>
  );
}