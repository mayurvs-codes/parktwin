"use client";

import React, { memo } from "react";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { SLOT_3D_POSITIONS } from "./twinConfig";

export interface TwinVehicle3DMeshProps {
  slot_id: string;
}

function TwinVehicle3DMeshComponent({ slot_id }: TwinVehicle3DMeshProps) {
  const slotState = useDigitalTwinStore((state) => state.slots[slot_id]);

  if (slotState?.status !== "occupied") {
    return null;
  }

  const pos = SLOT_3D_POSITIONS[slot_id] ?? { x: 0, z: 0 };

  return (
    <mesh position={[pos.x, 0.35, pos.z]} castShadow>
      <boxGeometry args={[0.7, 0.3, 0.45]} />
      <meshStandardMaterial color="#1d4ed8" roughness={0.3} metalness={0.2} />
    </mesh>
  );
}

export const TwinVehicle3DMesh = memo(TwinVehicle3DMeshComponent);
