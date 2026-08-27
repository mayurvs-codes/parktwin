import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { DashboardRefresh } from "@/components/dashboard/DashboardRefresh";
import { KpiCardGrid } from "@/components/dashboard/KpiCardGrid";
import { RecentActivityPanel } from "@/components/dashboard/RecentActivityPanel";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { SystemHealthPanel } from "@/components/dashboard/SystemHealthPanel";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Operational overview of the Smart Parking System.",
};

/**
 * Dashboard (Module 6 – Phase C).
 *
 * Operational overview composed of reusable sections: KPI cards, recent
 * activity, alerts, system health, and quick actions. Each section owns its
 * data fetching (via TanStack Query hooks) and its own loading / error /
 * empty states. All metrics come from the backend `/integration` gateway —
 * the frontend performs no business math.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Operational overview of the Smart Parking System
            </p>
          </div>
        </div>
        <DashboardRefresh />
      </header>

      <KpiCardGrid />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityPanel />
        </div>
        <div className="lg:col-span-1">
          <AlertsPanel />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SystemHealthPanel />
        <QuickActionsPanel />
      </div>
    </div>
  );
}
