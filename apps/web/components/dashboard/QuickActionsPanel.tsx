import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NAV_ITEMS, ROUTES } from "@/utils/routes";

/**
 * Quick actions — navigation cards to the operational sections. No new
 * functionality: every card is a link into an existing route (PROJECT_MEMORY.md
 * §15.7). Live Parking, Vehicles, Analytics, and Reports are all built; only the
 * Settings route remains a placeholder (post-H).
 */

const DESCRIPTIONS: Record<string, string> = {
  [ROUTES.parking]: "Real-time slot occupancy and active sessions.",
  [ROUTES.digitalTwin]: "Interactive 2D B2 facility spatial digital twin.",
  [ROUTES.vehicles]: "Vehicle registry, dwell time, and plate search.",
  [ROUTES.videoLibrary]: "Curated recorded CCTV video repository.",
  [ROUTES.videoProcessing]: "16-camera multi-channel CCTV surveillance center.",
  [ROUTES.anpr]: "Automated number-plate recognition & OCR scanning.",
  [ROUTES.analytics]: "Dwell time, hourly flow, and occupancy trends.",
  [ROUTES.reports]: "Generate operational audits and audit export.",
  [ROUTES.settings]: "System parameters, cameras, and data configuration.",
};

const ACTION_ITEMS = NAV_ITEMS.filter((item) => item.href !== ROUTES.dashboard);

export function QuickActionsPanel() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">System Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {ACTION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg border border-border/80 bg-background/50 p-3 transition-all hover:border-primary/40 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {DESCRIPTIONS[item.href] ?? "Open section"}
                  </p>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
