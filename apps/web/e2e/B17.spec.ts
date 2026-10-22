import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, demoDrive, getEpisodes, advanceViolationClock } from "./test-helpers";
import { VEH, numberAfter } from "./_shared";

test.describe("B17 — Cross-page consistency", () => {
  test("B17 [time-acceleration hook]: occupancy agrees across dashboard, live parking, vehicles and twin; the escalated violation agrees across portal, twin and backend", async ({ page }) => {
    test.setTimeout(120_000);
    const ctx = await setupE2E(page, "B17");

    // 60-bay demo scenario occupancy — same number on every operator page.
    await page.goto("/dashboard");
    const dash = await numberAfter(page, "Occupied Slots");
    await page.goto("/parking");
    const live = await numberAfter(page, "OCCUPIED (GREEN)");
    await page.goto("/vehicles");
    const veh = await numberAfter(page, "CURRENTLY PARKED");
    await page.goto("/digital-twin");
    await waitForWebSocket(page);
    const twin = await numberAfter(page, "TOTAL OCC");
    expect([live, veh, twin]).toEqual([dash, dash, dash]);
    await ctx.takeScreenshot(`occupancy_${dash}_everywhere`);

    // Escalated wrong-bay violation (B05 + B08) seen identically by driver, admin and backend.
    await demoDrive(page.request, { ...VEH, action: "enter", bay_id: "SP-11" });
    const [ep] = await getEpisodes(page.request, true);
    await advanceViolationClock(page.request, 601, ep.episode_id);
    const alert = page.locator("[data-testid='operational-violation-alert']");
    await expect(alert).toContainText("D3", { timeout: 10000 });
    await expect(alert).toContainText("C7");
    await ctx.takeScreenshot("twin_violation");

    await page.goto("/user/dashboard");
    await expect(page.locator("main")).toContainText(/parking violation \(unresolved\)/i, { timeout: 10000 });
    await expect(page.locator("main")).toContainText("D3");
    await ctx.takeScreenshot("portal_violation");

    const [after] = await getEpisodes(page.request, true);
    expect(after).toMatchObject({ assigned_bay: "SP-07", actual_bay: "SP-11", state: "ESCALATED" });
    await ctx.finish();
  });
});
