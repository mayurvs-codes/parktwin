"use client";

import React, { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ChevronDown, ChevronUp, RotateCcw, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CameraUploadStation } from "./CameraUploadStation";
import { JourneyFeed } from "./JourneyFeed";
import { useJourneyStationStore } from "@/store/useJourneyStationStore";
import { useGlobalProcessingStore } from "@/store/useGlobalProcessingStore";

export function MultiCameraControlCenter() {
  const [isExpanded, setIsExpanded] = useState(true);
  const stations = useJourneyStationStore((state) => state.stations);
  const clearAll = useJourneyStationStore((state) => state.clearAll);
  const clearAllJobs = useGlobalProcessingStore((state) => state.clearAllJobs);
  const queryClient = useQueryClient();

  const handleClearAll = useCallback(() => {
    clearAll();
    clearAllJobs();
  }, [clearAll, clearAllJobs]);

  const handleStationSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["parking"] });
    void queryClient.invalidateQueries({ queryKey: ["journeys"] });
    void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  }, [queryClient]);

  const hasAnyResults = Object.keys(stations).length > 0;

  return (
    <Card className="border border-border/80 bg-card/70 shadow-sm backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold">Multi-Camera ANPR Journey Hub</CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                3 Cameras Online
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Upload CCTV videos for Entry, Parking, and Exit to correlate vehicles via license plate and update the Digital Twin live.
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAnyResults && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
              title="Reset all camera uploads and ANPR cards"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear All Stations</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <span>Collapse</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Expand Cameras</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-0">
          {/* 3 Camera Upload Stations */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CameraUploadStation
              role="entry"
              title="Camera 1 · Entry Gate"
              description="Logs entry timestamp, plate, and vehicle classification"
              onSuccess={handleStationSuccess}
            />
            <CameraUploadStation
              role="parking"
              title="Camera 2 · Parking Area"
              description="Maps vehicle to parking bay & updates Digital Twin slot"
              onSuccess={handleStationSuccess}
            />
            <CameraUploadStation
              role="exit"
              title="Camera 3 · Exit Gate"
              description="Logs departure, calculates stay duration & frees slot"
              onSuccess={handleStationSuccess}
            />
          </div>

          {/* Journey Tracking Live Feed */}
          <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Correlated Vehicle Journeys
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                Automatic plate correlation across all 3 stations
              </span>
            </div>

            <JourneyFeed />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
