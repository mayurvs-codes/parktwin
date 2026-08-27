"use client";

import React from "react";
import { Box, Flame, Grid2x2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";

export interface TwinControlsProps {
  onReset?: () => void;
  isResetting?: boolean;
}

export function TwinControls({ onReset, isResetting }: TwinControlsProps = {}) {
  const viewMode = useDigitalTwinStore((state) => state.viewMode);
  const setViewMode = useDigitalTwinStore((state) => state.setViewMode);
  const showHeatmap = useDigitalTwinStore((state) => state.showHeatmap);
  const toggleHeatmap = useDigitalTwinStore((state) => state.toggleHeatmap);
  const resetDigitalTwin = useDigitalTwinStore((state) => state.resetDigitalTwin);

  const handleResetClick = () => {
    if (onReset) {
      onReset();
    } else {
      resetDigitalTwin();
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
      <Button
        variant={viewMode === "2d" ? "default" : "ghost"}
        size="sm"
        className="h-8 gap-1.5 px-3 text-xs font-semibold"
        onClick={() => setViewMode("2d")}
      >
        <Grid2x2 className="h-3.5 w-3.5" aria-hidden />
        2D
      </Button>
      <Button
        variant={viewMode === "3d" ? "default" : "ghost"}
        size="sm"
        className="h-8 gap-1.5 px-3 text-xs font-semibold"
        onClick={() => setViewMode("3d")}
      >
        <Box className="h-3.5 w-3.5" aria-hidden />
        3D
      </Button>
      <div className="h-4 w-px bg-border my-auto mx-0.5" />
      <Button
        variant={showHeatmap ? "default" : "ghost"}
        size="sm"
        className="h-8 gap-1.5 px-3 text-xs font-semibold"
        onClick={toggleHeatmap}
      >
        <Flame className="h-3.5 w-3.5" aria-hidden />
        Heat Map
      </Button>
      <div className="h-4 w-px bg-border my-auto mx-0.5" />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
        onClick={handleResetClick}
        disabled={isResetting}
        title="Reset view and slot selection"
      >
        <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} aria-hidden />
        Reset View
      </Button>
    </div>
  );
}
