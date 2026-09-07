import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StartProjectButton } from "@/components/dashboard/StartProjectButton";
import { ProjectResetButton } from "@/components/dashboard/ProjectResetButton";
import { DashboardRefresh } from "@/components/dashboard/DashboardRefresh";
import { SystemStatusRow } from "@/components/dashboard/SystemStatusRow";
import { KpiCardGrid } from "@/components/dashboard/KpiCardGrid";
import { RecentActivityPanel } from "@/components/dashboard/RecentActivityPanel";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { SystemHealthPanel } from "@/components/dashboard/SystemHealthPanel";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";

export const metadata: Metadata = {
  title: "Dashboard — ParkTwin AI",
  description: "Industrial Smart Parking Operating System · B2 Facility Telemetry",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Standardized Industrial Page Header with START PROJECT ── */}
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Industrial Smart Parking Operating System · B2 Facility Real-Time Operations"
        badge={
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            System Live
          </span>
        }
        rightSlot={
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            <StartProjectButton />
            <ProjectResetButton variant="destructive" />
            <DashboardRefresh />
          </div>
        }
      />

      {/* ── System Status Core Strip ── */}
      <SystemStatusRow />

      {/* ── KPI Telemetry Grid (60 Slots, Live Occupancy) ── */}
      <KpiCardGrid />

      {/* ── Main Activity & Alerts Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <RecentActivityPanel />
        </div>
        <div className="lg:col-span-1">
          <AlertsPanel />
        </div>
      </div>

      {/* ── System Health & Quick Actions ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-1">
          <SystemHealthPanel />
        </div>
        <div className="lg:col-span-2">
          <QuickActionsPanel />
        </div>
      </div>
    </div>
  );
}
