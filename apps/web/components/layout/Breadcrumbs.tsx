"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { getBreadcrumbs } from "@/utils/routes";

/** Breadcrumb trail derived from the current pathname. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  if (crumbs.length <= 1) {
    return <span className="text-sm font-medium text-muted-foreground">Home</span>;
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm sm:flex">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex min-w-0 items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
            )}
            {isLast ? (
              <span className="truncate font-medium text-foreground" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="flex items-center gap-1 truncate text-muted-foreground transition-colors hover:text-foreground"
              >
                {index === 0 && <Home className="h-4 w-4 shrink-0" aria-hidden />}
                <span className="truncate">{crumb.label}</span>
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
