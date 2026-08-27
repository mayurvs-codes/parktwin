"use client";

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
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.title}
            aria-label={collapsed ? item.title : undefined}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {!collapsed && <span>{item.title}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
