"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ParkingSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/utils/constants";
import { ROUTES } from "@/utils/routes";
import { NavLinks } from "./NavLinks";

/** Selector for elements that can receive keyboard focus inside the drawer. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SidebarProps {
  /** Desktop rail collapsed to icon-only width. */
  collapsed: boolean;
  /** Mobile drawer open state. */
  mobileOpen: boolean;
  /** Close the mobile drawer. */
  onClose: () => void;
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-16 items-center gap-2 border-b border-border px-4">
      <ParkingSquare className="h-6 w-6 shrink-0 text-primary" aria-hidden />
      {!collapsed && (
        <Link
          href={ROUTES.home}
          className="truncate text-lg font-semibold tracking-tight text-foreground"
        >
          {APP_NAME}
        </Link>
      )}
    </div>
  );
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <>
      <div className={cn("flex-1 overflow-y-auto p-4", collapsed && "px-2")}>
        <NavLinks orientation="vertical" collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      {!collapsed && (
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          {APP_NAME} · Module 6
        </div>
      )}
    </>
  );
}

/**
 * Navigation sidebar.
 * - Desktop (md+): fixed rail that collapses to an icon-only width.
 * - Mobile: off-canvas drawer with overlay, opened from the TopNav hamburger.
 */
export function Sidebar({ collapsed, mobileOpen, onClose }: SidebarProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Keep the latest onClose without making it an effect dependency: AppShell
  // passes a fresh inline arrow each render, so depending on it would tear down
  // and re-run this effect while the drawer is open (and overwrite
  // `previouslyFocused`, breaking focus restoration to the hamburger).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!mobileOpen) return;

    // Remember the element that opened the drawer (the hamburger in TopNav) so
    // focus can be returned to it when the drawer closes.
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Trap focus inside the drawer while it is open.
      if (event.key === "Tab" && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the drawer (the shared Dialog uses the panel; here we
    // focus the close button) so keyboard/screen-reader users start inside it.
    drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      // Restore focus to the trigger (or wherever focus was before opening).
      previouslyFocused.current?.focus?.();
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop rail */}
      <aside
        aria-label="Primary"
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out md:flex",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <Brand collapsed={collapsed} />
        <SidebarBody collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          ref={drawerRef}
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-card shadow-lg">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <ParkingSquare className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                <Link
                  href={ROUTES.home}
                  className="text-lg font-semibold tracking-tight text-foreground"
                  onClick={onClose}
                >
                  {APP_NAME}
                </Link>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarBody collapsed={false} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
