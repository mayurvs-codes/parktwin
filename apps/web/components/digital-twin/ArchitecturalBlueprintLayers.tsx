import React from "react";
import { FACILITY_SVG_GEOMETRY } from "./demoScenarioData";

/**
 * Architectural CAD car outline (top-down view)
 * Sized to accurately fill the parking stall (~75% width, ~80% length),
 * with 4 corner tires, windshields, side mirrors, roof, sunroof, and bumper curves.
 */
/**
 * 3D Volumetric Vehicle (Top-down Isometric with 3D lighting, glass reflections, wheels & shadows)
 * STRICT REQUIREMENT: Only Green or Red
 */
export function CadCarSymbol({
  x,
  y,
  heading = 0,
  scale = 1,
  color,
  bodyColor,
  isSelected = false,
}: {
  x: number;
  y: number;
  heading?: number;
  scale?: number;
  color?: string;
  bodyColor?: string;
  isSelected?: boolean;
}) {
  const rawColor = color || bodyColor || "#10b981";
  const isRed =
    rawColor === "#ef4444" ||
    rawColor === "#dc2626" ||
    rawColor === "#f43f5e" ||
    rawColor === "#b91c1c" ||
    rawColor.toLowerCase().includes("red");
  const strokeColor = isRed ? "#7f1d1d" : "#064e3b";
  const mirrorColor = isRed ? "#dc2626" : "#059669";

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${heading}) scale(${scale})`}
      pointerEvents="none"
    >
      {/* ─── Clean Subtle Contact Shadow ─── */}
      <rect
        x="-16"
        y="-32"
        width="32"
        height="64"
        rx="7"
        fill="rgba(0, 0, 0, 0.45)"
      />

      {/* ─── 4 Wheels (Clean Architectural Tires) ─── */}
      <rect x="-18.5" y="-22" width="4.5" height="13" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="0.8" />
      <rect x="14" y="-22" width="4.5" height="13" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="0.8" />
      <rect x="-18.5" y="9" width="4.5" height="13" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="0.8" />
      <rect x="14" y="9" width="4.5" height="13" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="0.8" />

      {/* ─── Main Sculpted Body Chassis ─── */}
      <rect
        x="-15.5"
        y="-32"
        width="31"
        height="64"
        rx="6"
        fill={isRed ? "#dc2626" : "#059669"}
        stroke={isSelected ? "#38bdf8" : strokeColor}
        strokeWidth={isSelected ? 2.2 : 1.2}
      />

      {/* Subtle Hood & Front Bumper Curve */}
      <path d="M -13 -32 Q 0 -35 13 -32" fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" />

      {/* Clean Headlights */}
      <rect x="-13" y="-31.5" width="4.5" height="2.5" rx="1" fill="#fef08a" opacity="0.9" />
      <rect x="8.5" y="-31.5" width="4.5" height="2.5" rx="1" fill="#fef08a" opacity="0.9" />

      {/* Aerodynamic Side Mirrors */}
      <path d="M -15.5 -12 L -19.5 -10.5 L -19.5 -8 L -15.5 -9 Z" fill={mirrorColor} stroke={strokeColor} strokeWidth="0.6" />
      <path d="M 15.5 -12 L 19.5 -10.5 L 19.5 -8 L 15.5 -9 Z" fill={mirrorColor} stroke={strokeColor} strokeWidth="0.6" />

      {/* ─── Glass Cabin (Front & Rear Windshields) ─── */}
      <rect x="-12.5" y="-14" width="25" height="38" rx="3.5" fill="#0b1329" stroke="rgba(0, 0, 0, 0.4)" strokeWidth="0.8" />

      {/* Front Windshield */}
      <path d="M -11.5 -13 L 11.5 -13 L 9.5 -2 L -9.5 -2 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.7" />

      {/* Side Windows */}
      <rect x="-12" y="0" width="1.8" height="15" rx="0.5" fill="#1e293b" />
      <rect x="10.2" y="0" width="1.8" height="15" rx="0.5" fill="#1e293b" />

      {/* Rear Windshield */}
      <path d="M -9.5 15 L 9.5 15 L 11.5 22 L -11.5 22 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.7" />

      {/* ─── Roof Panel with Sunroof ─── */}
      <rect x="-9.5" y="-2" width="19" height="17" rx="2" fill={isRed ? "#b91c1c" : "#047857"} stroke={strokeColor} strokeWidth="0.8" />
      <rect x="-5.5" y="2" width="11" height="8" rx="1.2" fill="#090d16" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.6" />

      {/* Taillights */}
      <rect x="-13" y="30" width="4.5" height="2" rx="0.8" fill="#ef4444" />
      <rect x="8.5" y="30" width="4.5" height="2" rx="0.8" fill="#ef4444" />
    </g>
  );
}

/**
 * Architectural Stair & Lift Core (Vector replica from CAD drawing)
 */
export function StairLiftCore({
  x,
  y,
  w = 300,
  h = 118,
  label = "Core",
  showInfrastructure = false,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
  showInfrastructure?: boolean;
}) {
  const stepsCount = 10;
  const stairW = 145;
  const stairH = 34;

  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none">
      {/* Outer structural perimeter room wall */}
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        fill="#0b1324"
        stroke="#334155"
        strokeWidth="2"
        rx="3"
      />

      {/* Top flight staircase */}
      <g transform="translate(45, 18)">
        <rect
          x="0"
          y="0"
          width={stairW}
          height={stairH}
          fill="rgba(30, 41, 59, 0.4)"
          stroke="#334155"
          strokeWidth="1"
        />
        {Array.from({ length: stepsCount }).map((_, i) => (
          <line
            key={`blue-step-${i}`}
            x1={(i + 1) * (stairW / (stepsCount + 1))}
            y1="0"
            x2={(i + 1) * (stairW / (stepsCount + 1))}
            y2={stairH}
            stroke="#475569"
            strokeWidth="1.2"
          />
        ))}
      </g>

      {/* Central divider */}
      <rect
        x="45"
        y="52"
        width={stairW}
        height="14"
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="1.5"
        rx="1"
      />

      {/* Bottom flight staircase */}
      <g transform="translate(45, 66)">
        <rect
          x="0"
          y="0"
          width={stairW}
          height={stairH}
          fill="rgba(30, 41, 59, 0.4)"
          stroke="#334155"
          strokeWidth="1"
        />
        {Array.from({ length: stepsCount }).map((_, i) => (
          <line
            key={`gray-step-${i}`}
            x1={(i + 1) * (stairW / (stepsCount + 1))}
            y1="0"
            x2={(i + 1) * (stairW / (stepsCount + 1))}
            y2={stairH}
            stroke="#475569"
            strokeWidth="1.2"
          />
        ))}
      </g>

      {/* Elevator / Lift Shaft (on right) */}
      <g transform={`translate(${w - 85}, 22)`}>
        <rect
          x="0"
          y="0"
          width="40"
          height="74"
          fill="#070d18"
          stroke="#0284c7"
          strokeWidth="1.5"
          rx="2"
        />
        <line x1="0" y1="0" x2="40" y2="74" stroke="#0284c7" strokeWidth="0.8" opacity="0.4" />
        <line x1="40" y1="0" x2="0" y2="74" stroke="#0284c7" strokeWidth="0.8" opacity="0.4" />
        <text
          x="20"
          y="41"
          fill="#38bdf8"
          fontSize="8"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
        >
          LIFT
        </text>
      </g>

      {/* Double doors to hallway */}
      <g transform={`translate(${w - 38}, 42)`}>
        <path
          d="M 0 0 A 18 18 0 0 1 18 18"
          fill="none"
          stroke="#475569"
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />
        <line x1="0" y1="0" x2="18" y2="0" stroke="#475569" strokeWidth="1.5" />
        <path
          d="M 0 36 A 18 18 0 0 0 18 18"
          fill="none"
          stroke="#475569"
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />
        <line x1="0" y1="36" x2="18" y2="36" stroke="#475569" strokeWidth="1.5" />
      </g>

      {/* Dimension callouts - Gated by showInfrastructure */}
      {showInfrastructure && (
        <>
          <text x="30" y="14" fill="#64748b" fontSize="7.5" fontFamily="monospace">
            2000
          </text>
          <text x="110" y="14" fill="#64748b" fontSize="7.5" fontFamily="monospace">
            1480
          </text>
          <text x="210" y="14" fill="#64748b" fontSize="7.5" fontFamily="monospace">
            3045
          </text>
        </>
      )}

      {/* Core title badge */}
      <text
        x={w / 2}
        y={h - 6}
        fill="#94a3b8"
        fontSize="8.5"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
        letterSpacing="1"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * East side architectural structures (Services & Storage, Lobbies)
 */
export function EastArchitecturalWing() {
  return (
    <g className="east-architectural-wing" pointerEvents="none">
      {/* ─── Top Lobby (2.8m wide) ────────────────────────────────────────── */}
      <g transform="translate(1375, 90)">
        <rect
          x="0"
          y="0"
          width="85"
          height="210"
          fill="#0b1324"
          stroke="#334155"
          strokeWidth="1.8"
          rx="2"
        />
        <g transform="translate(0, 100)">
          <path d="M 0 0 A 24 24 0 0 1 24 24" fill="none" stroke="#475569" strokeWidth="1.2" strokeDasharray="3 2" />
          <line x1="0" y1="0" x2="0" y2="24" stroke="#475569" strokeWidth="2" />
        </g>
        <text
          x="42"
          y="70"
          fill="#94a3b8"
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
          letterSpacing="1"
        >
          LOBBY
        </text>
        <text
          x="42"
          y="84"
          fill="#64748b"
          fontSize="7.5"
          fontFamily="monospace"
          textAnchor="middle"
        >
          2.8M WIDE
        </text>
      </g>

      {/* ─── Central Services & Storage Room ─────────── */}
      <g transform="translate(1375, 360)">
        <rect
          x="0"
          y="0"
          width="85"
          height="790"
          fill="#090e1a"
          stroke="#334155"
          strokeWidth="1.8"
          rx="2"
        />
        <g transform="translate(45, 395) rotate(-90)">
          <text
            x="0"
            y="4"
            fill="#64748b"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing="3"
            textAnchor="middle"
          >
            SERVICES / STORAGE
          </text>
        </g>
      </g>

      {/* ─── Bottom Lobby (3.0m wide) ─────────────────────────────────────── */}
      <g transform="translate(1375, 1260)">
        <rect
          x="0"
          y="0"
          width="85"
          height="200"
          fill="#0b1324"
          stroke="#334155"
          strokeWidth="1.8"
          rx="2"
        />
        <rect x="15" y="15" width="55" height="40" fill="#070d18" stroke="#0284c7" strokeWidth="1.2" rx="1" />
        <line x1="15" y1="15" x2="70" y2="55" stroke="#0284c7" strokeWidth="0.8" opacity="0.4" />
        <line x1="70" y1="15" x2="15" y2="55" stroke="#0284c7" strokeWidth="0.8" opacity="0.4" />

        <text
          x="42"
          y="95"
          fill="#94a3b8"
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="bold"
          textAnchor="middle"
          letterSpacing="1"
        >
          LOBBY
        </text>
        <text
          x="42"
          y="110"
          fill="#64748b"
          fontSize="7.5"
          fontFamily="monospace"
          textAnchor="middle"
        >
          3.0M WIDE
        </text>
      </g>
    </g>
  );
}

/**
 * Blueprint Red Circle Marker (e.g. (05), (10), (15)...)
 */
export function BlueprintRedCircle({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none">
      <circle cx="0" cy="0" r="9.5" fill="#ffffff" stroke="#ef4444" strokeWidth="1.4" opacity="0.95" />
      <text
        x="0"
        y="3"
        fill="#ef4444"
        fontSize="8"
        fontFamily="sans-serif"
        fontWeight="bold"
        textAnchor="middle"
      >
        {text}
      </text>
    </g>
  );
}

// STRICT REQUIREMENT: All cars must only be Green (#10b981) or Red (#ef4444)
const CAR_COLORS = ["#10b981", "#ef4444", "#10b981", "#ef4444", "#10b981", "#ef4444"];

/**
 * Complete Architectural Blueprint Layers — Every stall filled with a 3D CAD car!
 */
export function ArchitecturalBlueprintLayers({
  layerVisibility,
}: {
  layerVisibility?: {
    parking?: boolean;
    vehicles?: boolean;
    cameras?: boolean;
    routes?: boolean;
    zones?: boolean;
    coverage?: boolean;
    infrastructure?: boolean;
  };
} = {}) {
  const showInfrastructure = Boolean(layerVisibility?.infrastructure);
  const showCars = Boolean(layerVisibility?.vehicles ?? true);
  // Architectural background parked car (crisp 2D CAD car, alternating Green and Red)
  const StallCar = ({
    x,
    y,
    heading = 0,
    bodyColor = "#10b981",
  }: {
    x: number;
    y: number;
    heading?: number;
    bodyColor?: string;
  }) => {
    if (!showCars) return null;
    return (
      <CadCarSymbol
        x={x}
        y={y}
        heading={heading}
        scale={0.72}
        color={bodyColor}
      />
    );
  };


  return (
    <g className="blueprint-architectural-layers" pointerEvents="none">
      <defs>
        {/* 3D Volumetric Vehicle Shading Gradients */}
        <linearGradient id="car3DGreenBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="25%" stopColor="#34d399" />
          <stop offset="60%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="car3DRedBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#991b1b" />
          <stop offset="25%" stopColor="#f87171" />
          <stop offset="60%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="car3DGreenRoof" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="45%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="car3DRedRoof" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="45%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="carGlassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="35%" stopColor="#0f172a" />
          <stop offset="65%" stopColor="#334155" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <filter id="carDropShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* ─── CAD Structural Grid Lines (Red dashed centerlines - Gated by Infrastructure Layer) ─── */}
      {showInfrastructure && (
        <g className="cad-grid-lines" opacity={0.3}>
          {[45, 240, 345, 478, 820, 1161, 1290, 1375, 1420].map((x) => (
            <line
              key={`vgrid-${x}`}
              x1={x}
              y1={50}
              x2={x}
              y2={1495}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="16 6 3 6"
            />
          ))}
          {[90, 200, 303, 425, 565, 657, 778, 913, 1005, 1151, 1267, 1370, 1480].map((y) => (
            <line
              key={`hgrid-${y}`}
              x1={30}
              y1={y}
              x2={1440}
              y2={y}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="16 6 3 6"
            />
          ))}
        </g>
      )}

      {/* ─── Perimeter Wall Louvers & Openings (Cyan CAD vents) ─────────────── */}
      <g className="wall-louvers" stroke="#06b6d4" strokeWidth="2.5" opacity={0.75}>
        <line x1="45" y1="120" x2="45" y2="190" />
        <line x1="45" y1="210" x2="45" y2="280" />
        <line x1="45" y1="674" x2="45" y2="776" stroke="#eab308" strokeWidth="1.5" strokeDasharray="6 4" />
        <line x1="45" y1="800" x2="45" y2="880" />
        <line x1="45" y1="1170" x2="45" y2="1240" />
        <line x1="200" y1="1490" x2="350" y2="1490" />
        <line x1="600" y1="1490" x2="750" y2="1490" />
        <line x1="900" y1="1490" x2="1050" y2="1490" />
        <line x1="1200" y1="1490" x2="1350" y2="1490" />
      </g>

      {/* ─── 3 Central Architectural Parking Islands (Bases & Stalls) ───────── */}
      {FACILITY_SVG_GEOMETRY.islands.map((island, idx) => {
        const rowH = (island.h - 12) / 2; // ~125px per row
        const vertStallsCount = 8;
        const vertStallW = (1058 - 582) / vertStallsCount; // ~59.5px
        const horizStallH = (island.h - 10) / 4; // ~63px

        // Island 1 (idx === 0): West/East stalls rendered here; central vertical bays SP-14..29 rendered authoritatively by FacilityMap
        if (idx === 0) {
          return (
            <g key={island.id} className="island-1-focused-base">
              {/* Island 1 Concrete Floor Base */}
              <rect
                x={island.x}
                y={island.y}
                width={island.w}
                height={island.h}
                fill="#0b1324"
                stroke="#334155"
                strokeWidth="2"
                rx="4"
              />
              {/* Central Divider Curb */}
              <line
                x1={island.x + 8}
                y1={island.y + island.h / 2}
                x2={island.x + island.w - 8}
                y2={island.y + island.h / 2}
                stroke="#475569"
                strokeWidth="2.5"
              />
              {/* West end: 4 horizontal stalls (part of focused demo zone SP-17..SP-20, rendered by FacilityMap) */}
              {Array.from({ length: 4 }).map((_, i) => {
                const sy = island.y + 5 + i * horizStallH;
                return (
                  <g key={`isle-0-west-${i}`}>
                    <rect
                      x={island.x + 4}
                      y={sy}
                      width={98}
                      height={horizStallH - 4}
                      fill="#090e18"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              })}
              {/* East end: 4 horizontal stalls (FILLED WITH CARS) */}
              {Array.from({ length: 4 }).map((_, i) => {
                const sy = island.y + 5 + i * horizStallH;
                return (
                  <g key={`isle-0-east-${i}`}>
                    <rect
                      x={island.x + island.w - 102}
                      y={sy}
                      width={98}
                      height={horizStallH - 4}
                      fill="#090e18"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    <StallCar
                      x={island.x + island.w - 53}
                      y={sy + (horizStallH - 4) / 2}
                      heading={90}
                      bodyColor={CAR_COLORS[(i + 1) % CAR_COLORS.length]}
                    />
                  </g>
                );
              })}
            </g>
          );
        }

        return (
          <g key={island.id} className={`island-${idx + 1}-base`}>
            {/* Island Concrete Floor */}
            <rect
              x={island.x}
              y={island.y}
              width={island.w}
              height={island.h}
              fill="#0d1424"
              stroke="#334155"
              strokeWidth="2"
              rx="3"
            />

            {/* West end: 4 horizontal stalls (FILLED WITH CARS) */}
            {Array.from({ length: 4 }).map((_, i) => {
              const sy = island.y + 5 + i * horizStallH;
              return (
                <g key={`isle-${idx}-west-${i}`}>
                  <rect
                    x={island.x + 4}
                    y={sy}
                    width={98}
                    height={horizStallH - 4}
                    fill="#090e18"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <StallCar
                    x={island.x + 53}
                    y={sy + (horizStallH - 4) / 2}
                    heading={-90}
                    bodyColor={CAR_COLORS[(idx * 4 + i) % CAR_COLORS.length]}
                  />
                </g>
              );
            })}

            {/* Island middle divider / curb */}
            <line
              x1={582}
              y1={island.y + rowH + 6}
              x2={1058}
              y2={island.y + rowH + 6}
              stroke="#475569"
              strokeWidth="2.5"
            />

            {/* Middle: 8 vertical stalls (Bottom row facing South, FILLED WITH CARS) */}
            {Array.from({ length: vertStallsCount }).map((_, i) => {
              const sx = 582 + i * vertStallW;
              return (
                <g key={`isle-${idx}-bot-${i}`}>
                  <rect
                    x={sx}
                    y={island.y + rowH + 8}
                    width={vertStallW - 4}
                    height={rowH}
                    fill="#090e18"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <StallCar
                    x={sx + (vertStallW - 4) / 2}
                    y={island.y + rowH + 8 + rowH / 2}
                    heading={180}
                    bodyColor={CAR_COLORS[(idx * 8 + i + 3) % CAR_COLORS.length]}
                  />
                </g>
              );
            })}

            {/* East end: 4 horizontal stalls (FILLED WITH CARS) */}
            {Array.from({ length: 4 }).map((_, i) => {
              const sy = island.y + 5 + i * horizStallH;
              return (
                <g key={`isle-${idx}-east-${i}`}>
                  <rect
                    x={island.x + island.w - 102}
                    y={sy}
                    width={98}
                    height={horizStallH - 4}
                    fill="#090e18"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <StallCar
                    x={island.x + island.w - 53}
                    y={sy + (horizStallH - 4) / 2}
                    heading={90}
                    bodyColor={CAR_COLORS[(idx * 4 + i + 1) % CAR_COLORS.length]}
                  />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* ─── Top Perimeter Row: Background Stalls (excluding Row A SP-01 to SP-13) ─── */}
      <g className="top-perimeter-stalls">
        {Array.from({ length: 18 }).map((_, i) => {
          const sx = 70 + i * 60.5;
          // Exclude Row A (SP-01 to SP-13) which is rendered authoritatively by FacilityMap
          if (sx >= 190 && sx <= 1045) return null;
          return (
            <g key={`top-stall-${i}`}>
              <rect
                x={sx}
                y={92}
                width={56}
                height={104}
                fill="#090e18"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <StallCar
                x={sx + 28}
                y={144}
                heading={180}
                bodyColor={CAR_COLORS[i % CAR_COLORS.length]}
              />
            </g>
          );
        })}
      </g>

      {/* ─── Bottom Perimeter Row: 17 Vertical Stalls (ALL FILLED WITH CARS) ── */}
      <g className="bottom-perimeter-stalls">
        {/* Left cluster (8 stalls) */}
        {Array.from({ length: 8 }).map((_, i) => {
          const sx = 70 + i * 60.5;
          return (
            <g key={`bot-stall-l-${i}`}>
              <rect
                x={sx}
                y={1374}
                width={56}
                height={104}
                fill="#090e18"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <StallCar
                x={sx + 28}
                y={1426}
                heading={0}
                bodyColor={CAR_COLORS[i % CAR_COLORS.length]}
              />
            </g>
          );
        })}

        {/* Emergency exit / column void marker (800x1500) */}
        <g transform="translate(560, 1374)">
          <rect x="0" y="0" width="30" height="104" fill="#090e18" stroke="#ef4444" strokeWidth="1.2" opacity="0.7" />
          <line x1="0" y1="0" x2="30" y2="104" stroke="#ef4444" strokeWidth="1" opacity="0.6" />
          <line x1="30" y1="0" x2="0" y2="104" stroke="#ef4444" strokeWidth="1" opacity="0.6" />
          {showInfrastructure && (
            <text x="15" y="55" fill="#ef4444" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              800
            </text>
          )}
        </g>

        {/* Right cluster (excluding South Perimeter canonical stalls SP-51 to SP-56) */}
        {Array.from({ length: 9 }).map((_, i) => {
          const sx = 600 + i * 60.5;
          // Exclude SP-51 to SP-56 which are rendered authoritatively by FacilityMap
          if (sx >= 560 && sx <= 980) return null;
          return (
            <g key={`bot-stall-r-${i}`}>
              <rect
                x={sx}
                y={1374}
                width={56}
                height={104}
                fill="#090e18"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <StallCar
                x={sx + 28}
                y={1426}
                heading={0}
                bodyColor={CAR_COLORS[(i + 2) % CAR_COLORS.length]}
              />
            </g>
          );
        })}
      </g>

      {/* ─── West Perimeter Clusters & Stair Cores (ALL FILLED WITH CARS) ──── */}
      {/* Cluster 1 (4 stalls) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const sx = 52 + i * 71;
        return (
          <g key={`wc1-${i}`}>
            <rect x={sx} y={307} width={67} height={114} fill="#090e18" stroke="#334155" strokeWidth="1.2" />
            <StallCar x={sx + 33.5} y={364} heading={180} bodyColor={CAR_COLORS[i % CAR_COLORS.length]} />
          </g>
        );
      })}

      {/* Stair & Lift Core 1 */}
      <StairLiftCore x={45} y={425} w={300} h={118} label="STAIR & LIFT CORE 01" showInfrastructure={showInfrastructure} />

      {/* Cluster 2 (4 stalls) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const sx = 52 + i * 71;
        return (
          <g key={`wc2-${i}`}>
            <rect x={sx} y={547} width={67} height={123} fill="#090e18" stroke="#334155" strokeWidth="1.2" />
            <StallCar x={sx + 33.5} y={608} heading={180} bodyColor={CAR_COLORS[(i + 1) % CAR_COLORS.length]} />
          </g>
        );
      })}

      {/* West ENTRY Ramp stencil label */}
      <g transform="translate(170, 730)">
        <text
          x="0"
          y="0"
          fill="#94a3b8"
          fontSize="14"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="3"
          textAnchor="middle"
          opacity="0.65"
        >
          ◄ ENTRY RAMP
        </text>
      </g>

      {/* Cluster 3 (4 stalls) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const sx = 52 + i * 71;
        return (
          <g key={`wc3-${i}`}>
            <rect x={sx} y={780} width={67} height={122} fill="#090e18" stroke="#334155" strokeWidth="1.2" />
            <StallCar x={sx + 33.5} y={841} heading={180} bodyColor={CAR_COLORS[(i + 2) % CAR_COLORS.length]} />
          </g>
        );
      })}

      {/* Stair & Lift Core 2 */}
      <StairLiftCore x={45} y={906} w={300} h={116} label="STAIR & LIFT CORE 02" showInfrastructure={showInfrastructure} />

      {/* Cluster 4 (4 stalls) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const sx = 52 + i * 71;
        return (
          <g key={`wc4-${i}`}>
            <rect x={sx} y={1025} width={67} height={124} fill="#090e18" stroke="#334155" strokeWidth="1.2" />
            <StallCar x={sx + 33.5} y={1087} heading={180} bodyColor={CAR_COLORS[(i + 3) % CAR_COLORS.length]} />
          </g>
        );
      })}

      {/* ─── East Perimeter Stalls Column (ALL 22 FILLED WITH CARS) ─────────── */}
      {Array.from({ length: 22 }).map((_, i) => {
        const sy = 94 + i * 57.5;
        return (
          <g key={`east-stall-${i}`}>
            <rect
              x={1292}
              y={sy}
              width={79}
              height={53.5}
              fill="#090e18"
              stroke="#334155"
              strokeWidth="1.2"
            />
            <StallCar
              x={1331}
              y={sy + 26.7}
              heading={-90}
              bodyColor={CAR_COLORS[i % CAR_COLORS.length]}
            />
          </g>
        );
      })}

      {/* East Lobbies & Services / Storage Wing */}
      <EastArchitecturalWing />

      {/* ─── Blueprint Red Circle Badges (Gated by Infrastructure Layer) ───── */}
      {showInfrastructure && (
        <>
          <BlueprintRedCircle x={140} y={105} text="05" />
          <BlueprintRedCircle x={440} y={105} text="10" />
          <BlueprintRedCircle x={740} y={105} text="15" />
          <BlueprintRedCircle x={1040} y={105} text="20" />
          <BlueprintRedCircle x={530} y={335} text="45" />
          <BlueprintRedCircle x={850} y={335} text="50" />
          <BlueprintRedCircle x={1110} y={335} text="55" />
          <BlueprintRedCircle x={530} y={690} text="40" />
          <BlueprintRedCircle x={850} y={690} text="35" />
          <BlueprintRedCircle x={530} y={1035} text="30" />
          <BlueprintRedCircle x={850} y={1035} text="25" />
          <BlueprintRedCircle x={1330} y={120} text="01" />
          <BlueprintRedCircle x={1330} y={640} text="12" />
          <BlueprintRedCircle x={1330} y={1350} text="22" />
          <BlueprintRedCircle x={440} y={1465} text="35" />
          <BlueprintRedCircle x={740} y={1465} text="30" />
          <BlueprintRedCircle x={1040} y={1465} text="25" />
        </>
      )}

      {/* ─── Structural Columns (CAD Pillars with Yellow Collars) ─────────── */}
      <g className="structural-grid-columns">
        {FACILITY_SVG_GEOMETRY.gridColumns.map((col, i) => (
          <g key={`grid-col-${i}`} transform={`translate(${col.x - 9}, ${col.y - 9})`}>
            {/* Structural Concrete Column Outer Base with Yellow Collar */}
            <rect
              x="0"
              y="0"
              width="18"
              height="18"
              fill="#0f172a"
              stroke="#eab308"
              strokeWidth="1.2"
              strokeOpacity="0.85"
              rx="2"
            />
            {/* Concrete Column Core */}
            <rect x="3.5" y="3.5" width="11" height="11" fill="#070b14" stroke="#475569" strokeWidth="0.8" />
          </g>
        ))}
      </g>
    </g>
  );
}
