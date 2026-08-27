"use client";

import React, { useMemo } from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { TwinHeatmap2DLayer } from "./TwinHeatmap";
import { TwinSlot2D } from "./TwinSlot2D";
import {
  ENTRY_X,
  EXIT_X,
  getSlotPosition,
  ROW_A_Y,
  ROW_B_Y,
  ROW_START_X,
  SLOT_GAP,
  SLOT_H,
  SLOT_W,
  SLOTS_PER_ROW,
  TWIN_CANVAS_HEIGHT,
  TWIN_CANVAS_WIDTH,
} from "./twinConfig";

export interface TwinCanvas2DProps {
  selectedSlotId: string | null;
  onSlotSelect: (id: string | null) => void;
  utilizationMap?: Record<string, number>;
}

/** Derive dashed centre-line dash positions in the driving lane */
const DASH_COUNT = 8;
const DASH_W = 34;
const DASH_H = 6;
const LANE_Y = 155;           // top of driving-lane band
const LANE_H = 70;            // height of lane band
const DASH_Y = LANE_Y + LANE_H / 2 - DASH_H / 2;
const DASH_STEP = TWIN_CANVAS_WIDTH / DASH_COUNT;

export function TwinCanvas2D({
  selectedSlotId,
  onSlotSelect,
  utilizationMap,
}: TwinCanvas2DProps) {
  const slots = useDigitalTwinStore((state) => state.slots);

  const slotIds = useMemo(() => Object.keys(slots).sort(), [slots]);

  /* total width used by one row of slots */
  const rowWidth = SLOTS_PER_ROW * SLOT_W + (SLOTS_PER_ROW - 1) * SLOT_GAP;

  return (
    <div style={{ overflowX: "auto" }} className="w-full rounded-xl">
      <Stage
        width={TWIN_CANVAS_WIDTH}
        height={TWIN_CANVAS_HEIGHT}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) onSlotSelect(null);
        }}
      >
        <Layer>
          {/* ── Ground ── */}
          <Rect
            x={0} y={0}
            width={TWIN_CANVAS_WIDTH}
            height={TWIN_CANVAS_HEIGHT}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: TWIN_CANVAS_HEIGHT }}
            fillLinearGradientColorStops={[0, "#0d1829", 1, "#0f172a"]}
          />

          {/* ── Slot-bay shading – Row A ── */}
          <Rect
            x={ROW_START_X - 10}
            y={ROW_A_Y - 10}
            width={rowWidth + 20}
            height={SLOT_H + 20}
            cornerRadius={8}
            fill="#1a2744"
            opacity={0.6}
          />

          {/* ── Slot-bay shading – Row B ── */}
          <Rect
            x={ROW_START_X - 10}
            y={ROW_B_Y - 10}
            width={rowWidth + 20}
            height={SLOT_H + 20}
            cornerRadius={8}
            fill="#1a2744"
            opacity={0.6}
          />

          {/* ── Driving Lane ── */}
          <Rect
            x={0} y={LANE_Y}
            width={TWIN_CANVAS_WIDTH}
            height={LANE_H}
            fill="#111827"
          />

          {/* Dashed centre line */}
          {Array.from({ length: DASH_COUNT }, (_, i) => (
            <Rect
              key={`dash-${i}`}
              x={i * DASH_STEP + (DASH_STEP - DASH_W) / 2}
              y={DASH_Y}
              width={DASH_W}
              height={DASH_H}
              fill="#334155"
              cornerRadius={2}
            />
          ))}

          <Text
            text="DRIVING LANE"
            x={0} y={LANE_Y + LANE_H / 2 - 7}
            width={TWIN_CANVAS_WIDTH}
            align="center"
            fill="#1e3a5f"
            fontStyle="italic bold"
            fontSize={13}
            listening={false}
          />

          {/* ── Row labels ── */}
          <Text
            text="ROW A"
            x={ROW_START_X - 55}
            y={ROW_A_Y + SLOT_H / 2 - 8}
            fill="#60a5fa"
            fontSize={12}
            fontStyle="bold"
          />
          <Text
            text="ROW B"
            x={ROW_START_X - 55}
            y={ROW_B_Y + SLOT_H / 2 - 8}
            fill="#60a5fa"
            fontSize={12}
            fontStyle="bold"
          />

          {/* ── Slot number labels above Row A ── */}
          {Array.from({ length: SLOTS_PER_ROW }, (_, i) => (
            <Text
              key={`num-${i}`}
              text={`${i + 1}`}
              x={ROW_START_X + i * (SLOT_W + SLOT_GAP) + SLOT_W / 2 - 6}
              y={ROW_A_Y - 22}
              fill="#334155"
              fontSize={11}
              fontStyle="bold"
            />
          ))}

          {/* ── Entry / Exit markers ── */}
          {/* Entry arrow */}
          <Rect x={ENTRY_X - 4} y={TWIN_CANVAS_HEIGHT - 28} width={68} height={20} fill="#052e16" cornerRadius={4} />
          <Text
            text="ENTRY ▶▶"
            x={ENTRY_X - 2}
            y={TWIN_CANVAS_HEIGHT - 24}
            fill="#4ade80"
            fontSize={11}
            fontStyle="bold"
          />
          {/* Exit arrow */}
          <Rect x={EXIT_X - 4} y={TWIN_CANVAS_HEIGHT - 28} width={60} height={20} fill="#450a0a" cornerRadius={4} />
          <Text
            text="◀◀ EXIT"
            x={EXIT_X - 2}
            y={TWIN_CANVAS_HEIGHT - 24}
            fill="#f87171"
            fontSize={11}
            fontStyle="bold"
          />

          {/* ── Parking Slot Tiles ── */}
          {slotIds.map((slotId) => {
            const pos = getSlotPosition(slotId);
            return (
              <TwinSlot2D
                key={slotId}
                slot_id={slotId}
                x={pos.x}
                y={pos.y}
                isSelected={selectedSlotId === slotId}
                onSelect={() => onSlotSelect(slotId)}
              />
            );
          })}

          {/* ── Heatmap Overlay ── */}
          <TwinHeatmap2DLayer utilizationMap={utilizationMap} />
        </Layer>
      </Stage>
    </div>
  );
}
