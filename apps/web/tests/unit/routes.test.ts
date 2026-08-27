import { describe, expect, it } from "vitest";
import { getBreadcrumbs, NAV_ITEMS, ROUTES } from "@/utils/routes";

describe("utils/routes.ts", () => {
  it("ROUTES has all expected keys and correct values", () => {
    expect(ROUTES.home).toBe("/");
    expect(ROUTES.dashboard).toBe("/dashboard");
    expect(ROUTES.parking).toBe("/parking");
    expect(ROUTES.vehicles).toBe("/vehicles");
    expect(ROUTES.analytics).toBe("/analytics");
    expect(ROUTES.reports).toBe("/reports");
    expect(ROUTES.settings).toBe("/settings");
    expect(ROUTES.videoProcessing).toBe("/video-processing");
    expect(ROUTES.anpr).toBe("/anpr");
  });

  it("NAV_ITEMS contains items matching routes", () => {
    expect(NAV_ITEMS.length).toBeGreaterThan(0);
    const dashboardNav = NAV_ITEMS.find((item) => item.href === ROUTES.dashboard);
    expect(dashboardNav).toBeDefined();
    expect(dashboardNav?.title).toBe("Dashboard");
  });

  it("getBreadcrumbs returns correct trail for /dashboard", () => {
    const crumbs = getBreadcrumbs("/dashboard");
    expect(crumbs).toEqual([
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
    ]);
  });

  it("getBreadcrumbs returns correct trail for /parking", () => {
    const crumbs = getBreadcrumbs("/parking");
    expect(crumbs).toEqual([
      { label: "Home", href: "/" },
      { label: "Live Parking", href: "/parking" },
    ]);
  });

  it("getBreadcrumbs handles unknown multi-level path segments with fallback title case", () => {
    const crumbs = getBreadcrumbs("/vehicles/detail-info");
    expect(crumbs).toEqual([
      { label: "Home", href: "/" },
      { label: "Vehicles", href: "/vehicles" },
      { label: "Detail-info", href: "/vehicles/detail-info" },
    ]);
  });
});
