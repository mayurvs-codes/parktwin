"use client";

import { useMemo, useState } from "react";
import { ParkingSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useLiveParking } from "@/hooks/useLiveParking";
import { useParkingWebSocket } from "@/hooks/useParkingWebSocket";
import type { ParkingSlotView } from "@/types/parking";
import { ParkingLayout } from "./ParkingLayout";
import { ParkingLegend } from "./ParkingLegend";
import { ParkingSummary } from "./ParkingSummary";
import { SlotDetailsDialog } from "./SlotDetailsDialog";
import { JourneyFeed } from "@/components/digital-twin/JourneyFeed";

/** How often the polling queries re-read the authoritative backend snapshot. */
const REFETCH_INTERVAL_MS = 5000;

/**
 * Live Parking (Module 6 – Phase D) — orchestrates the real-time visualization.
 *
 * This is a **presentation layer only**: all parking state arrives from the
 * existing backend `/integration` gateway (slots, sessions, occupancy) and is
 * re-read on an interval. The `useParkingWebSocket` hook additionally listens
 * to the backend's live broadcasts and nudges a refresh, but the data always
 * comes from the gateway — no occupancy, ownership, or duration math runs here.
 */
export function LiveParkingView() {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const { views, occupancy, isLoading, isError, refetch } = useLiveParking(
    undefined,
    REFETCH_INTERVAL_MS
  );

  // Live nudges: backend WS broadcasts invalidate the polling queries, which
  // then re-read the authoritative snapshot. Transport is swappable here only.
  useParkingWebSocket({ channels: ["occupancy", "sessions"], enabled: true });

  const selectedView = useMemo<ParkingSlotView | null>(
    () => views.find((v) => v.slot.slot_id === selectedSlotId) ?? null,
    [views, selectedSlotId]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ParkingSquare className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Live Parking</h1>
            <p className="text-sm text-muted-foreground">Real-time view of the parking lot</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          aria-label="Refresh parking data"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </header>

      <ParkingSummary occupancy={occupancy} isLoading={isLoading} />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Lot Layout</CardTitle>
          <ParkingLegend />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ParkingGridSkeleton />
          ) : isError ? (
            <ErrorState
              title="Couldn't load the parking lot"
              description="The live parking data is unavailable."
              onRetry={() => refetch()}
            />
          ) : views.length === 0 ? (
            <EmptyState
              icon={ParkingSquare}
              title="No parking slots"
              description="There are no slots configured or reported by the backend yet."
            />
          ) : (
            <ParkingLayout
              views={views}
              selectedSlotId={selectedSlotId}
              onSelect={setSelectedSlotId}
            />
          )}
        </CardContent>
      </Card>

      {/* Recent 3-Camera Station Journey Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Gate &amp; Station Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <JourneyFeed />
        </CardContent>
      </Card>

      <SlotDetailsDialog
        view={selectedView}
        open={selectedSlotId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSlotId(null);
        }}
      />
    </div>
  );
}

/** Skeleton placeholder mirroring the grouped lot-layout shape. */
function ParkingGridSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[12, 8].map((count, gi) => (
        <div key={gi} className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
