"use client";

import React, { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  LayoutDashboard,
  ParkingSquare,
  Car,
  BarChart3,
  Menu,
  X,
  Layers3,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { ThemeToggle } from "@/components/common/ThemeToggle";
const DemoControllerBar = dynamic(
  () => import("./DemoControllerBar").then((mod) => mod.DemoControllerBar),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-11 rounded-xl border border-slate-800/80 bg-slate-950/80 animate-pulse" />
    ),
  }
);
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useCctvEvidenceModalStore } from "@/store/useCctvEvidenceModalStore";
import { ROUTES } from "@/utils/routes";

interface UserShellProps {
  children: ReactNode;
}

export function UserShell({ children }: UserShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const openModal = useCctvEvidenceModalStore((s) => s.openModal);

  const navItems = [
    {
      label: "Dashboard",
      href: "/user/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/user" || pathname === "/user/dashboard",
    },
    {
      label: "Parking",
      href: "/user/parking",
      icon: ParkingSquare,
      active: pathname.startsWith("/user/parking"),
      sublinks: [
        { label: "Find Parking", href: "/user/parking/find" },
        { label: "My Reservation", href: "/user/parking/reservation" },
        { label: "Parking Session", href: "/user/parking/session" },
      ],
    },
    {
      label: "Navigation",
      href: "/user/navigation",
      icon: Compass,
      active: pathname === "/user/navigation",
    },
    {
      label: "My Vehicles",
      href: "/user/vehicles",
      icon: Car,
      active: pathname === "/user/vehicles",
    },
    {
      label: "Analytics",
      href: "/user/analytics",
      icon: BarChart3,
      active: pathname === "/user/analytics",
    },
  ];

  return (
    <div
      className={`bg-[#070b14] text-slate-100 flex flex-col font-sans antialiased ${
        pathname === "/user/navigation" ? "h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      {/* ── Driver Portal Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Brand / Logo */}
            <div className="flex items-center gap-6">
              <Link href="/user/dashboard" className="flex items-center gap-2.5 group">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-md shadow-sky-950/50 group-hover:scale-105 transition-transform">
                  <Compass className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold tracking-tight text-white font-mono text-sm">
                      PARKTWIN AI
                    </span>
                    <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 border border-sky-500/30">
                      Driver
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">
                    Smart Journey Guidance
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-800">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        item.active
                          ? "bg-slate-800/90 text-white font-semibold shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${item.active ? "text-sky-400" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Controls: Portal Switcher + Theme Toggle */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Grounded Evidence Badge */}
              <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-slate-300 text-[11px]">
                  {activeVehicleId}
                </span>
                <span className="text-[10px] text-slate-400 border-l border-slate-800 pl-1.5">
                  CAM-01
                </span>
              </div>
 
              {/* Real CCTV Evidence Viewer Modal Trigger */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openModal({ camera: "CAM-01" })}
                className="h-8 gap-1.5 text-xs font-mono border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 hover:text-white"
                title="View Real CCTV Video & Extracted Frames"
              >
                <Camera className="h-3.5 w-3.5 text-sky-400" />
                <span className="hidden sm:inline">CCTV Evidence</span>
              </Button>

              {/* Switch to Admin Portal Button */}
              <Link href={ROUTES.dashboard}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-mono border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Switch to Facility Admin System"
                >
                  <Layers3 className="h-3.5 w-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Admin System</span>
                </Button>
              </Link>

              <ThemeToggle />

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-slate-800 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2.5 ${
                      item.active
                        ? "bg-slate-800 text-white font-semibold"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-sky-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Deterministic Demo Controller Ribbon ── */}
        <div className="border-t border-slate-800/60 bg-slate-950/70 py-1.5 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <DemoControllerBar />
          </div>
        </div>
      </header>

      {/* ── Main Driver Content Body ── */}
      <main
        className={
          pathname === "/user/navigation"
            ? "flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 overflow-hidden flex flex-col"
            : "flex-1 mx-auto max-w-7xl w-full p-4 sm:p-6 lg:p-8 space-y-6"
        }
      >
        {children}
      </main>

      {/* ── Minimal Driver Footer (omitted on navigation screen for clean docked HUD) ── */}
      {pathname !== "/user/navigation" && (
        <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs font-mono text-slate-400">
          ParkTwin AI Driver Portal · Verified Facility Geometry & Real CCTV Physical Evidence
        </footer>
      )}
    </div>
  );
}
