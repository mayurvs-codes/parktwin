import {
  BarChart3,
  Car,
  Cctv,
  FileText,
  Film,
  Layers3,
  LayoutDashboard,
  ParkingSquare,
  ScanLine,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical route paths. Use these constants instead of inline strings so the
 * router and navigation stay in sync. Single source of truth for URLs.
 */
export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  parking: "/parking",
  digitalTwin: "/digital-twin",
  vehicles: "/vehicles",
  videoLibrary: "/video-library",
  videoProcessing: "/video-processing",
  anpr: "/anpr",
  analytics: "/analytics",
  reports: "/reports",
  settings: "/settings",
} as const;

export type RouteKey = keyof typeof ROUTES;

export type NavGroup = "overview" | "operations" | "intelligence" | "system";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  group: NavGroup;
  liveIndicator?: boolean;
}

/** Primary navigation, surfaced in the sidebar and (via drawer) top navigation. */
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard, group: "overview" },
  { title: "Live Parking", href: ROUTES.parking, icon: ParkingSquare, group: "operations", liveIndicator: true },
  { title: "Digital Twin", href: ROUTES.digitalTwin, icon: Layers3, group: "operations" },
  { title: "Vehicles", href: ROUTES.vehicles, icon: Car, group: "operations" },
  { title: "Video", href: ROUTES.videoLibrary, icon: Film, group: "operations" },
  { title: "CCTV", href: ROUTES.videoProcessing, icon: Cctv, group: "operations", liveIndicator: true },
  { title: "ANPR", href: ROUTES.anpr, icon: ScanLine, group: "intelligence" },
  { title: "Analytics", href: ROUTES.analytics, icon: BarChart3, group: "intelligence" },
  { title: "Reports", href: ROUTES.reports, icon: FileText, group: "intelligence" },
  { title: "Settings", href: ROUTES.settings, icon: Settings, group: "system" },
];

/** Human-readable label for a URL segment (used by breadcrumbs). */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  parking: "Live Parking",
  "digital-twin": "Digital Twin",
  vehicles: "Vehicles",
  "video-library": "Video",
  "video-processing": "CCTV",
  anpr: "ANPR",
  analytics: "Analytics",
  reports: "Reports",
  settings: "Settings",
};

export interface Crumb {
  label: string;
  href: string;
}

/**
 * Build a breadcrumb trail from a pathname (e.g. `/vehicles/abc` →
 * Home › Vehicles › Abc). Unknown segments are title-cased.
 */
export function getBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Home", href: ROUTES.home }];
  let href = "";
  for (const seg of segments) {
    href += `/${seg}`;
    const label = SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href });
  }
  return crumbs;
}
