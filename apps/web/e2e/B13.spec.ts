import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, assertCanvasRendersPixels } from "./test-helpers";
import { numberAfter } from "./_shared";

test.describe("B13 — 2D <-> 3D parity", () => {
  test("B13: selecting SP-01 in 2D survives toggling to a rendering 3D scene and back; occupancy counts unchanged", async ({ page }) => {
    const ctx = await setupE2E(page, "B13");
    await page.goto("/digital-twin");
    await waitForWebSocket(page);

    const occ2D = await numberAfter(page, "TOTAL OCC");
    // User action: click the parked vehicle in bay SP-01 (opens the inspector) on the 2D map.
    await page.locator("[data-testid='twin-slot-SP-01']").first().dispatchEvent("click");
    await expect(page.locator("main")).toContainText(/Assigned Space\s*B1/);
    await ctx.takeScreenshot("2d_sp01_selected");

    const selector = page.getByTestId("twin-view-mode-selector");
    await selector.getByRole("button", { name: "3D" }).click();
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2500); // let the WebGL scene draw a few frames
    const bytes = await assertCanvasRendersPixels(page, "canvas");
    await expect(page.locator("main")).toContainText(/Assigned Space\s*B1/);
    expect(await numberAfter(page, "TOTAL OCC")).toBe(occ2D);
    await ctx.takeScreenshot(`3d_rendered_${bytes}_bytes`);

    await selector.getByRole("button", { name: "2D" }).click();
    await expect(page.locator("[data-testid='twin-slot-SP-01']").first()).toBeVisible();
    await expect(page.locator("main")).toContainText(/Assigned Space\s*B1/);
    expect(await numberAfter(page, "TOTAL OCC")).toBe(occ2D);
    await ctx.takeScreenshot("back_to_2d");
    await ctx.finish();
  });
});
