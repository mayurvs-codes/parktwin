import React, { memo } from "react";
import { Group, Rect, Text } from "react-konva";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { SLOT_H, SLOT_W } from "./twinConfig";

export interface TwinSlot2DProps {
  slot_id: string;
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: () => void;
}

function getStatusStyle(status: string) {
  switch (status) {
    case "free":
      return { fill: "#bbf7d0", stroke: "#22c55e" };
    case "occupied":
      return { fill: "#fecaca", stroke: "#ef4444" };
    case "reserved":
      return { fill: "#fde68a", stroke: "#f59e0b" };
    case "violation":
      return { fill: "#fef08a", stroke: "#eab308" };
    case "unknown":
    default:
      return { fill: "#e2e8f0", stroke: "#94a3b8" };
  }
}

function TwinSlot2DComponent({
  slot_id,
  x,
  y,
  isSelected,
  onSelect,
}: TwinSlot2DProps) {
  const slotState = useDigitalTwinStore((state) => state.slots[slot_id]);
  const status = slotState?.status ?? "unknown";
  const plate = slotState?.license_plate ?? null;
  const style = getStatusStyle(status);

  const displayPlate = plate
    ? plate.length > 10
      ? plate.slice(0, 10)
      : plate
    : null;

  return (
    <Group
      x={x}
      y={y}
      onClick={onSelect}
      onTap={onSelect}
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "pointer";
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "default";
      }}
    >
      <Rect
        width={SLOT_W}
        height={SLOT_H}
        cornerRadius={6}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={isSelected ? 3 : 1.5}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={isSelected ? 6 : 2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      <Text
        text={slot_id}
        x={8}
        y={8}
        fontSize={12}
        fontStyle="bold"
        fill={style.stroke}
      />
      {(status === "occupied" || status === "reserved") && displayPlate && (
        <Text
          text={displayPlate}
          x={4}
          y={32}
          width={SLOT_W - 8}
          align="center"
          fontSize={11}
          fontStyle="bold"
          fill="#1e293b"
        />
      )}
    </Group>
  );
}

export const TwinSlot2D = memo(TwinSlot2DComponent);
