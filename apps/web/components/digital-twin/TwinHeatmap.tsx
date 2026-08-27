"use client";

import React, { useMemo } from "react";
import { Group, Rect } from "react-konva";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import {
  getSlotPosition,
  SLOT_3D_POSITIONS,
  SLOT_H,
  SLOT_W,
} from "./twinConfig";

/** Maps utilization percentage (0–100) to heat map color hex string. */
export function heatColor(pct: number): string {
  if (pct <= 20) return "#3b82f6"; // Blue (low utilization / default)
  if (pct <= 40) return "#22c55e"; // Green
  if (pct <= 60) return "#eab308"; // Yellow
  if (pct <= 80) return "#f97316"; // Orange
  return "#ef4444"; // Red (high utilization)
}

export interface HeatmapLayerProps {
  utilizationMap?: Record<string, number>;
}

/** 2D Konva Heatmap Layer overlay. */
export function TwinHeatmap2DLayer({ utilizationMap = {} }: HeatmapLayerProps) {
  const showHeatmap = useDigitalTwinStore((state) => state.showHeatmap);
  const slots = useDigitalTwinStore((state) => state.slots);

  const slotIds = useMemo(() => Object.keys(slots).sort(), [slots]);

  if (!showHeatmap) {
    return null;
  }

  return (
    <Group>
      {slotIds.map((slotId) => {
        const pos = getSlotPosition(slotId);
        const pct = utilizationMap[slotId] ?? 0;
        const color = heatColor(pct);

        return (
          <Rect
            key={`heat-2d-${slotId}`}
            x={pos.x}
            y={pos.y}
            width={SLOT_W}
            height={SLOT_H}
            cornerRadius={6}
            fill={color}
            opacity={0.55}
            listening={false}
          />
        );
      })}
    </Group>
  );
}

/** 3D R3F Heatmap Overlay mesh group. */
export function TwinHeatmap3DOverlay({ utilizationMap = {} }: HeatmapLayerProps) {
  const showHeatmap = useDigitalTwinStore((state) => state.showHeatmap);
  const slots = useDigitalTwinStore((state) => state.slots);

  const slotIds = useMemo(() => Object.keys(slots).sort(), [slots]);

  if (!showHeatmap) {
    return null;
  }

  return (
    <group>
      {slotIds.map((slotId) => {
        const pos = SLOT_3D_POSITIONS[slotId] ?? { x: 0, z: 0 };
        const pct = utilizationMap[slotId] ?? 0;
        const color = heatColor(pct);

        return (
          <mesh
            key={`heat-3d-${slotId}`}
            position={[pos.x, 0.12, pos.z]}
          >
            <boxGeometry args={[1.02, 0.02, 0.67]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.5}
              roughness={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}
