import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { DashboardRefresh } from "@/components/dashboard/DashboardRefresh";
import { PrototypeMondayView } from "@/components/dashboard/PrototypeMondayView";
import { KpiCardGrid } from "@/components/dashboard/KpiCardGrid";
import { RecentActivityPanel } from "@/components/dashboard/RecentActivityPanel";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { SystemHealthPanel } from "@/components/dashboard/SystemHealthPanel";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";

export const metadata: Metadata = {
  title: "Dashboard — ParkTwin AI",
  description: "Operational overview of the Smart Parking System.",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* ── P0 Monday 3-Day Prototype View ── */}
      <PrototypeMondayView />

      {/* ── System Telemetry & Operations ── */}
      <div className="pt-6 border-t space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LayoutDashboard className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Facility Operations & Telemetry</h2>
              <p className="text-xs text-muted-foreground">
                Integration layer status, active alerts, and analytics
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
    </div>
  );
}
