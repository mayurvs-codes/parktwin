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
  [ROUTES.parking]: "View real-time slot occupancy and live sessions.",
  [ROUTES.vehicles]: "Browse detected vehicles and plate history.",
  [ROUTES.analytics]: "Explore occupancy, traffic, and utilization trends.",
  [ROUTES.reports]: "Generate and download operational reports.",
};

const ACTION_ITEMS = NAV_ITEMS.filter(
  (item) =>
    item.href === ROUTES.parking ||
    item.href === ROUTES.vehicles ||
    item.href === ROUTES.analytics ||
    item.href === ROUTES.reports
);

export function QuickActionsPanel() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACTION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {DESCRIPTIONS[item.href] ?? "Open section"}
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
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
