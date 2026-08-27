"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { GlobalProcessingManager } from "@/components/providers/GlobalProcessingManager";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <GlobalProcessingManager />
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
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  );
}
