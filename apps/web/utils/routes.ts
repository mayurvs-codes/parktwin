import {
  BarChart3,
  Car,
  FileText,
  Layers3,
  LayoutDashboard,
  ParkingSquare,
  ScanLine,
  Settings,
  Video,
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
  analytics: "/analytics",
  reports: "/reports",
  settings: "/settings",
  videoProcessing: "/video-processing",
  anpr: "/anpr",
} as const;

export type RouteKey = keyof typeof ROUTES;

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

/** Primary navigation, surfaced in the sidebar and (via drawer) top navigation. */
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { title: "Live Parking", href: ROUTES.parking, icon: ParkingSquare },
  { title: "Digital Twin", href: ROUTES.digitalTwin, icon: Layers3 },
  { title: "Vehicles", href: ROUTES.vehicles, icon: Car },
  { title: "CCTV Control Center", href: ROUTES.videoProcessing, icon: Video },
  { title: "ANPR Upload", href: ROUTES.anpr, icon: ScanLine },
  { title: "Analytics", href: ROUTES.analytics, icon: BarChart3 },
  { title: "Reports", href: ROUTES.reports, icon: FileText },
  { title: "Settings", href: ROUTES.settings, icon: Settings },
];

/** Human-readable label for a URL segment (used by breadcrumbs). */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  parking: "Live Parking",
  "digital-twin": "Digital Twin",
  vehicles: "Vehicles",
  "video-processing": "CCTV Control Center",
  anpr: "ANPR Upload",
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
