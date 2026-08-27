"use client";

import React, { memo } from "react";
import { Text } from "@react-three/drei";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { SLOT_3D_POSITIONS, STATUS_3D_COLORS } from "./twinConfig";

export interface TwinSlot3DMeshProps {
  slot_id: string;
}

function TwinSlot3DMeshComponent({ slot_id }: TwinSlot3DMeshProps) {
  const slotState = useDigitalTwinStore((state) => state.slots[slot_id]);
  const selectedSlotId = useDigitalTwinStore((state) => state.selectedSlotId);
  const selectSlot = useDigitalTwinStore((state) => state.selectSlot);

  const pos = SLOT_3D_POSITIONS[slot_id] ?? { x: 0, z: 0 };
  const status = slotState?.status ?? "unknown";
  const color = STATUS_3D_COLORS[status];
  const isSelected = selectedSlotId === slot_id;

  return (
    <group>
      <mesh
        position={[pos.x, 0.05, pos.z]}
        onClick={(e) => {
          e.stopPropagation();
          selectSlot(slot_id);
        }}
      >
        <boxGeometry args={[1.0, 0.1, 0.65]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? color : "#000000"}
          emissiveIntensity={isSelected ? 0.4 : 0}
        />
      </mesh>
      <Text
        position={[pos.x, 0.12, pos.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.16}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {slot_id}
      </Text>
    </group>
  );
}

export const TwinSlot3DMesh = memo(TwinSlot3DMeshComponent);
