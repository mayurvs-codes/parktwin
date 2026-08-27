"use client";

import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Refresh control for the whole dashboard. Invalidates every dashboard query
 * so all panels re-fetch in parallel. Shows a spinner while any dashboard
 * query is in flight.
 */
export function DashboardRefresh() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["dashboard"] }) > 0;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isFetching}
      onClick={() => void queryClient.invalidateQueries({ queryKey: ["dashboard"] })}
      aria-label="Refresh dashboard data"
    >
      <RefreshCw className={isFetching ? "animate-spin" : ""} aria-hidden />
      {isFetching ? "Refreshing" : "Refresh"}
    </Button>
  );
}
