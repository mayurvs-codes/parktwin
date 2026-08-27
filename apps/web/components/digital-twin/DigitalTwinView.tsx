"use client";

import dynamic from "next/dynamic";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsDashboard } from "@/hooks/useAnalytics";
import { useDigitalTwinSocket } from "@/hooks/useDigitalTwinSocket";
import { useParkingWebSocket } from "@/hooks/useParkingWebSocket";
import { fetchOccupancy, fetchSessions, fetchSlots, resetDigitalTwinState } from "@/services/parking";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { useJourneyStationStore } from "@/store/useJourneyStationStore";
import { useGlobalProcessingStore } from "@/store/useGlobalProcessingStore";
import type { ParkingSlotView, SessionDTO, SlotDTO, SlotStatus } from "@/types/parking";
import { TwinCanvas2D } from "./TwinCanvas2D";
import { TwinControls } from "./TwinControls";
import { TwinLegend } from "./TwinLegend";
import { TwinSlotPopover } from "./TwinSlotPopover";
import { TwinStatisticsPanel } from "./TwinStatisticsPanel";
import { TwinSummaryBar } from "./TwinSummaryBar";
import { MultiCameraControlCenter } from "./MultiCameraControlCenter";

const TwinCanvas3D = dynamic(() => import("./TwinCanvas3D"), { ssr: false });

const REFETCH_INTERVAL_MS = 15_000; // 15s — WebSocket handles real-time; poll is fallback only

export default function DigitalTwinView() {
  const slots = useDigitalTwinStore((state) => state.slots);
  const selectedSlotId = useDigitalTwinStore((state) => state.selectedSlotId);
  const selectSlot = useDigitalTwinStore((state) => state.selectSlot);
  const initializeSlots = useDigitalTwinStore((state) => state.initializeSlots);
  const resetDigitalTwin = useDigitalTwinStore((state) => state.resetDigitalTwin);
  const clearStationFeeds = useJourneyStationStore((state) => state.clearAll);
  const clearAllJobs = useGlobalProcessingStore((state) => state.clearAllJobs);
  const viewMode = useDigitalTwinStore((state) => state.viewMode);

  const [isResetting, setIsResetting] = useState(false);

  // Initialize socket for live delta updates
  useDigitalTwinSocket();

  // Keep WebSocket nudges for occupancy REST query invalidation
  useParkingWebSocket({ channels: ["occupancy", "sessions"], enabled: true });

  // Separate query for TwinSummaryBar occupancy metrics
  const {
    data: occupancy,
    isLoading: isOccupancyLoading,
    refetch: refetchOccupancy,
  } = useQuery({
    queryKey: ["parking", "occupancy", "all"],
    queryFn: () => fetchOccupancy(),
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  // Query analytics dashboard for Heatmap and Statistics Panel
  const { data: analyticsData, refetch: refetchAnalytics } = useAnalyticsDashboard();

  const utilizationMap = useMemo<Record<string, number>>(() => {
    if (!analyticsData?.utilization) return {};

    const map: Record<string, number> = {};
    const mostUsed = analyticsData.utilization.most_used_slots || [];
    const leastUsed = analyticsData.utilization.least_used_slots || [];

    let maxCount = 1;
    for (const item of [...mostUsed, ...leastUsed]) {
      if (item.usage_count > maxCount) {
        maxCount = item.usage_count;
      }
    }

    for (const item of mostUsed) {
      const slotKey = String(item.slot_id);
      map[slotKey] = Math.min(100, Math.round((item.usage_count / maxCount) * 100));
    }
    for (const item of leastUsed) {
      const slotKey = String(item.slot_id);
      if (!(slotKey in map)) {
        map[slotKey] = Math.min(100, Math.round((item.usage_count / maxCount) * 100));
      }
    }

    return map;
  }, [analyticsData]);

  // Query slots through React Query so invalidations reload the 2D/3D facility map
  const {
    data: slotsData,
    isLoading: isSlotsLoading,
    isError: isSlotsError,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ["parking", "slots", "all"],
    queryFn: () => fetchSlots(),
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  // Query active sessions through React Query
  const {
    data: sessionsData,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["parking", "sessions", true, 200, "all"],
    queryFn: () => fetchSessions(true, 200),
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  // Synchronize query results to the Digital Twin Zustand store reactively
  useEffect(() => {
    if (slotsData) {
      initializeSlots(slotsData, sessionsData || []);
    }
  }, [slotsData, sessionsData, initializeSlots]);

  const queryClient = useQueryClient();

  const handleRefresh = () => {
    void refetchSlots();
    void refetchSessions();
    void refetchOccupancy();
    void refetchAnalytics();
  };

  const handleResetDigitalTwin = async () => {
    setIsResetting(true);
    try {
      resetDigitalTwin();
      clearStationFeeds();
      clearAllJobs();
      await resetDigitalTwinState();
      await queryClient.invalidateQueries({ queryKey: ["parking"] });
      await queryClient.invalidateQueries({ queryKey: ["journeys"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      await Promise.all([
        refetchSlots(),
        refetchSessions(),
        refetchOccupancy(),
        refetchAnalytics(),
      ]);
    } catch (err) {
      console.error("Failed to reset digital twin state:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const slotIds = useMemo(() => Object.keys(slots), [slots]);

  const selectedState = selectedSlotId ? slots[selectedSlotId] ?? null : null;

  const selectedView = useMemo<ParkingSlotView | null>(() => {
    if (!selectedState) return null;

    let status: SlotStatus = "unknown";
    if (selectedState.status === "free") status = "available";
    else if (selectedState.status === "occupied") status = "occupied";
    else if (selectedState.status === "reserved") status = "reserved";
    else if (selectedState.status === "violation") status = "reserved";

    const slotDto: SlotDTO = {
      id: null,
      slot_id: selectedState.slot_id,
      camera_id: selectedState.camera_id,
      zone: selectedState.zone,
      state:
        selectedState.status === "free"
          ? "free"
          : selectedState.status === "occupied"
          ? "occupied"
          : "unknown",
      is_reserved: selectedState.status === "reserved",
      reserved_for: null,
      position: null,
      created_at: null,
      updated_at: selectedState.last_updated,
    };

    const sessionDto: SessionDTO | null = selectedState.license_plate
      ? {
          session_uid: null,
          camera_id: selectedState.camera_id,
          slot_id: selectedState.slot_id,
          license_plate: selectedState.license_plate,
          tracking_id: null,
          entry_time: selectedState.occupied_since,
          exit_time: null,
          duration_seconds: selectedState.duration_seconds,
          is_active: true,
          violation_flags: [],
        }
      : null;

    return {
      slot: slotDto,
      status,
      plate: selectedState.license_plate,
      vehicleType: selectedState.vehicle_type,
      session: sessionDto,
    };
  }, [selectedState]);

  const isLoading = isSlotsLoading || isOccupancyLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers3 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Digital Twin
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time virtual replica of the parking facility
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDigitalTwin}
            disabled={isResetting || isLoading}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Reset digital twin"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} aria-hidden />
            <span>Reset Digital Twin</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isResetting}
            aria-label="Refresh digital twin data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </Button>
        </div>
      </header>

      <TwinSummaryBar occupancy={occupancy ?? null} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <CardTitle>
                  {viewMode === "2d" ? "2D Facility Map" : "3D Facility Map"}
                </CardTitle>
                <TwinControls onReset={handleResetDigitalTwin} isResetting={isResetting} />
              </div>
              <TwinLegend />
            </CardHeader>
            <CardContent>
              {isSlotsLoading ? (
                <Skeleton className="h-[380px] w-full rounded-lg" />
              ) : isSlotsError ? (
                <ErrorState
                  title="Couldn't load the digital twin"
                  description="The live digital twin data is unavailable."
                  onRetry={handleRefresh}
                />
              ) : slotIds.length === 0 ? (
                <EmptyState
                  icon={Layers3}
                  title="No digital twin slots"
                  description="There are no slots configured or reported by the backend yet."
                />
              ) : viewMode === "2d" ? (
                <TwinCanvas2D
                  selectedSlotId={selectedSlotId}
                  onSlotSelect={selectSlot}
                  utilizationMap={utilizationMap}
                />
              ) : (
                <Suspense
                  fallback={<Skeleton className="h-[500px] w-full rounded-lg" />}
                >
                  <TwinCanvas3D utilizationMap={utilizationMap} />
                </Suspense>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <TwinStatisticsPanel />
        </div>
      </div>

      <TwinSlotPopover
        slotView={selectedView}
        onClose={() => selectSlot(null)}
      />

      {/* Multi-Camera 3-Station ANPR Hub */}
      <MultiCameraControlCenter />
    </div>
  );
}
