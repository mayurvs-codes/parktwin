"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, ROUTES } from "@/utils/routes";

interface NavLinksProps {
  orientation?: "vertical" | "horizontal";
  /** When true (desktop rail collapsed), show icons only with a tooltip. */
  collapsed?: boolean;
  /** Called after a link is activated (e.g. close the mobile drawer). */
  onNavigate?: () => void;
}

/** Shared navigation list, reused by the sidebar (desktop + mobile drawer). */
export function NavLinks({
  orientation = "vertical",
  collapsed = false,
  onNavigate,
}: NavLinksProps) {
  const pathname = usePathname();

  let lastGroup = "";

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex gap-1",
        orientation === "vertical" ? "flex-col" : "flex-row items-center"
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== ROUTES.home && pathname.startsWith(item.href));
        const Icon = item.icon;
        const isNewGroup = orientation === "vertical" && !collapsed && item.group !== lastGroup;
        if (isNewGroup) {
          lastGroup = item.group;
        }

        return (
          <React.Fragment key={item.href}>
            {isNewGroup && (
              <div className="mt-3 mb-1 px-3 text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/60">
                {item.group}
              </div>
            )}
            <Link
              href={item.href}
              title={item.title}
              aria-label={collapsed ? item.title : undefined}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>{item.title}</span>
                  {item.liveIndicator && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </div>
              )}
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
