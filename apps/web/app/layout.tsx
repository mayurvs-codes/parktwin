import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/theme.css";
import "./globals.css";
import { APP_NAME, STORAGE_KEYS } from "@/utils/constants";
import { Providers } from "@/components/providers/Providers";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Smart Parking Intelligence`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "AI-powered Smart Parking Platform — live occupancy, vehicles, analytics, and reports.",
};

/**
 * Applies the persisted/system theme before first paint to avoid a flash of the
 * wrong theme. Mirrors `ThemeProvider` logic so hydration stays consistent.
 */
const themeInitScript = `(function(){try{var k='${STORAGE_KEYS.theme}';var t=localStorage.getItem(k)||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
