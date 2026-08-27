"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Route, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchAllJourneys, type JourneyStatus } from "@/services/journey";
import { JourneyTimeline } from "./JourneyTimeline";

export function JourneyFeed() {
  const [activeTab, setActiveTab] = useState<JourneyStatus | "all">("all");
  const [searchPlate, setSearchPlate] = useState("");

  const {
    data: journeys = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["journeys", activeTab],
    queryFn: () => fetchAllJourneys(activeTab === "all" ? undefined : activeTab),
    refetchInterval: 4000,
  });

  const filtered = journeys.filter((j) => {
    if (!searchPlate) return true;
    return j.license_plate.toLowerCase().includes(searchPlate.toLowerCase());
  });

  return (
    <div className="space-y-3">
      {/* Top filters and search bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(["all", "entering", "parked", "exited"] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={activeTab === tab ? "default" : "outline"}
              onClick={() => setActiveTab(tab)}
              className="h-7 text-xs capitalize"
            >
              {tab}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search plate…"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Refresh journeys"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Journeys List */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Route}
          title="No journeys found"
          description={
            searchPlate
              ? `No vehicle journey matching "${searchPlate}".`
              : "Upload CCTV footage at the Entry, Parking, or Exit stations above to begin tracking."
          }
        />
      ) : (
        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
          {filtered.map((journey) => (
            <JourneyTimeline key={journey.id} journey={journey} />
          ))}
        </div>
      )}
    </div>
  );
}
