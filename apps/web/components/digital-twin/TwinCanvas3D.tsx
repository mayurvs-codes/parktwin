"use client";

import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html as DreiHtml, OrbitControls } from "@react-three/drei";
import { formatDuration } from "@/lib/format";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { SLOT_3D_POSITIONS } from "./twinConfig";
import { TwinHeatmap3DOverlay } from "./TwinHeatmap";
import { TwinSlot3DMesh } from "./TwinSlot3DMesh";
import { TwinVehicle3DMesh } from "./TwinVehicle3DMesh";
import { bayLabel } from "@/utils/bayLabel";

export interface TwinCanvas3DProps {
  utilizationMap?: Record<string, number>;
}

/** Dashed lane dividers rendered as thin box meshes */
function LaneDividers() {
  const dashCount = 6;
  const dashWidth = 0.4;
  const dashDepth = 0.06;
  const step = 1.0;
  const startX = -(dashCount / 2) * step + step / 2;
  return (
    <group>
      {Array.from({ length: dashCount }, (_, i) => (
        <mesh key={i} position={[startX + i * step, 0.005, 0]}>
          <boxGeometry args={[dashWidth, 0.01, dashDepth]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
    </group>
  );
}

/** Entrance / exit pillars */
function EntryExitMarkers() {
  return (
    <group>
      {/* Entry — left side */}
      <mesh position={[-3.6, 0.3, 0]}>
        <boxGeometry args={[0.08, 0.6, 0.5]} />
        <meshStandardMaterial color="#22c55e" emissive="#166534" emissiveIntensity={0.4} />
      </mesh>
      {/* Exit — right side */}
      <mesh position={[3.6, 0.3, 0]}>
        <boxGeometry args={[0.08, 0.6, 0.5]} />
        <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/** Perimeter kerb walls */
function Kerbs() {
  const kerbColor = "#1e3a5f";
  return (
    <group>
      {/* Front & back */}
      <mesh position={[0, 0.04, -3.2]}>
        <boxGeometry args={[8.2, 0.08, 0.1]} />
        <meshStandardMaterial color={kerbColor} />
      </mesh>
      <mesh position={[0, 0.04, 3.2]}>
        <boxGeometry args={[8.2, 0.08, 0.1]} />
        <meshStandardMaterial color={kerbColor} />
      </mesh>
      {/* Left & right */}
      <mesh position={[-4.1, 0.04, 0]}>
        <boxGeometry args={[0.1, 0.08, 6.4]} />
        <meshStandardMaterial color={kerbColor} />
      </mesh>
      <mesh position={[4.1, 0.04, 0]}>
        <boxGeometry args={[0.1, 0.08, 6.4]} />
        <meshStandardMaterial color={kerbColor} />
      </mesh>
    </group>
  );
}

export default function TwinCanvas3D({ utilizationMap }: TwinCanvas3DProps) {
  const slots = useDigitalTwinStore((state) => state.slots);
  const selectedSlotId = useDigitalTwinStore((state) => state.selectedSlotId);
  const selectSlot = useDigitalTwinStore((state) => state.selectSlot);

  const slotIds = useMemo(() => Object.keys(slots).sort(), [slots]);

  const selectedState = selectedSlotId ? slots[selectedSlotId] ?? null : null;
  const selectedPos = selectedSlotId
    ? SLOT_3D_POSITIONS[selectedSlotId] ?? { x: 0, z: 0 }
    : null;

  return (
    <div className="w-full overflow-hidden rounded-xl bg-[#0a1020]">
      <Canvas
        style={{ width: "100%", height: "520px" }}
        camera={{ position: [0, 9, 8], fov: 48 }}
        frameloop="demand"
        shadows
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) selectSlot(null);
        }}
      >
        {/* ── Lighting ── */}
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[6, 12, 6]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-4, 6, -4]} intensity={0.3} />

        <OrbitControls
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2.15}
          enablePan
          enableZoom
        />

        {/* ── Ground Plane (10-slot lot: 8.2 × 6.4 world units) ── */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[8.2, 6.4]} />
          <meshStandardMaterial color="#0f1e35" roughness={0.9} metalness={0.05} />
        </mesh>

        {/* Driving lane highlight */}
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[8.2, 0.9]} />
          <meshStandardMaterial color="#1e293b" roughness={0.95} transparent opacity={0.85} />
        </mesh>

        {/* Dashed centre line */}
        <LaneDividers />

        {/* Perimeter kerbs */}
        <Kerbs />

        {/* Entry / Exit markers */}
        <EntryExitMarkers />

        {/* ── 10 Parking Slot Meshes ── */}
        {slotIds.map((id) => (
          <TwinSlot3DMesh key={id} slot_id={id} />
        ))}

        {/* ── Vehicle Meshes (occupied slots) ── */}
        {slotIds.map((id) => (
          <TwinVehicle3DMesh key={id} slot_id={id} />
        ))}

        {/* ── Heatmap Overlay ── */}
        <TwinHeatmap3DOverlay utilizationMap={utilizationMap} />

        {/* ── Selected Slot Popover ── */}
        {selectedSlotId && selectedPos && selectedState && (
          <DreiHtml position={[selectedPos.x, 1.2, selectedPos.z]} center>
            <div className="pointer-events-none min-w-[140px] rounded-lg border border-border bg-card/95 p-2.5 text-center text-xs shadow-xl backdrop-blur">
              <p className="font-bold text-foreground text-sm">Slot {bayLabel(selectedSlotId)}</p>
              <p className="font-medium text-primary mt-0.5">
                {selectedState.license_plate || "No Vehicle"}
              </p>
              {selectedState.duration_seconds > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDuration(selectedState.duration_seconds)}
                </p>
              )}
            </div>
          </DreiHtml>
        )}
      </Canvas>
    </div>
  );
}
