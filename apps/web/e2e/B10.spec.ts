import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, demoDrive, getEpisodes, advanceViolationClock } from "./test-helpers";
import { VEH } from "./_shared";

test.describe("B10 — Early exit", () => {
  test("B10 [time-acceleration hook]: vehicle leaves the wrong bay at minute 7 — bay released, episode resolved, no violation", async ({ page }) => {
    const ctx = await setupE2E(page, "B10");
    await page.goto("/digital-twin");
    await waitForWebSocket(page);

    await demoDrive(page.request, { ...VEH, action: "enter", bay_id: "SP-11" });
    const [ep] = await getEpisodes(page.request, true);
    await advanceViolationClock(page.request, 420, ep.episode_id);
    await expect(page.locator("main")).toContainText(/violation \(d3\)/i, { timeout: 10000 });
    await ctx.takeScreenshot("wrong_bay_minute_7");

    const leave = await demoDrive(page.request, { ...VEH, action: "leave", bay_id: "SP-11" });
    expect(leave.episodes.find((e: { episode_id: string }) => e.episode_id === ep.episode_id).state).toBe("RESOLVED");

    // UI: violation badge gone, bay back to free, no admin alert.
    await expect(page.locator("main")).not.toContainText(/violation \(d3\)/i, { timeout: 10000 });
    await expect(page.locator("[data-testid='operational-violation-alert']")).toHaveCount(0);
    await ctx.takeScreenshot("bay_released");

    const later = await advanceViolationClock(page.request, 900);
    expect(later.emitted_events).toHaveLength(0);
    const all = await getEpisodes(page.request, false);
    expect(all).toHaveLength(1);
    expect(all[0].state).toBe("RESOLVED");
    expect(all[0].escalated ?? false).toBe(false);
    await ctx.finish();
  });
});
