"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import dynamic from "next/dynamic";
import { GlobalProcessingManager } from "@/components/providers/GlobalProcessingManager";
const UserShell = dynamic(
  () => import("@/components/user/UserShell").then((mod) => mod.UserShell),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    ),
  }
);
import { CctvEvidenceModal } from "@/components/evidence/CctvEvidenceModal";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Isolate driver-facing User Portal layout
  if (pathname?.startsWith("/user")) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <GlobalProcessingManager />
        <CctvEvidenceModal />
        <UserShell>{children}</UserShell>
      </div>
    );
  }

  // Isolate standalone experimental 3D Parking Zone layout
  if (pathname?.startsWith("/3d-zone")) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#050811] text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <GlobalProcessingManager />
      <CctvEvidenceModal />
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <TopNav
          onToggleCollapse={() => setCollapsed((value) => !value)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        {/* Keyboard / screen-reader shortcut to bypass the navigation. */}
        <a
          href="#main-content"
          className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-none focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {pathname === "/digital-twin" ? (
          <main id="main-content" className="flex-1 overflow-hidden p-0 flex flex-col">
            {children}
          </main>
        ) : (
          <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {children}
            <Footer />
          </main>
        )}
      </div>
    </div>
  );
}
