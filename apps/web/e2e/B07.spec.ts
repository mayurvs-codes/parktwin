import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, demoDrive, getEpisodes, advanceViolationClock } from "./test-helpers";
import { VEH } from "./_shared";

test.describe("B07 — Wrong-bay 8-minute stage", () => {
  test("B07 [time-acceleration hook]: 479 s changes nothing; 481 s shows one grace-period-ending warning in the admin twin", async ({ page }) => {
    const ctx = await setupE2E(page, "B07");
    await page.goto("/digital-twin");
    await waitForWebSocket(page);

    await demoDrive(page.request, { ...VEH, action: "enter", bay_id: "SP-11" });
    const [ep] = await getEpisodes(page.request, true);
    expect(ep.state).toBe("WARNED");

    const at479 = await advanceViolationClock(page.request, 479, ep.episode_id);
    expect(at479.emitted_events).toHaveLength(0);
    expect((await getEpisodes(page.request, true))[0].state).toBe("WARNED");
    await expect(page.locator("[data-testid='duration-warning-alert']")).toHaveCount(0);
    await ctx.takeScreenshot("admin_twin_479s");

    const at481 = await advanceViolationClock(page.request, 481, ep.episode_id);
    // The backend's real-time violation clock may already have fired the 480 s warning in the
    // second between the two calls; either way it is emitted once and only once.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(at481.emitted_events.every((e: any) => e.event_type === "WRONG_BAY_DURATION_WARNING")).toBe(true);
    expect(at481.emitted_events.length).toBeLessThanOrEqual(1);
    expect((await getEpisodes(page.request, true))[0].state).toBe("WARNING_DURATION");

    const alert = page.locator("[data-testid='duration-warning-alert']");
    await expect(alert).toHaveCount(1, { timeout: 10000 });
    await expect(alert).toContainText("GRACE PERIOD ENDING");
    await expect(alert).toContainText("D3");
    await expect(alert).toContainText("C7");
    await expect(page.locator("[data-testid='operational-violation-alert']")).toHaveCount(0);
    await ctx.takeScreenshot("admin_twin_481s_grace_period_ending");
    await ctx.finish();
  });
});
