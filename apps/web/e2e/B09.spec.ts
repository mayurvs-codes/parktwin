import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, unlockVoice, demoDrive, getEpisodes, advanceViolationClock } from "./test-helpers";
import { VEH } from "./_shared";

test.describe("B09 — Relocation", () => {
  test("B09 [time-acceleration hook]: wrong bay at minute 5, driver moves to SP-07 — warning clears, timer restarts, no escalation later", async ({ page }) => {
    const ctx = await setupE2E(page, "B09");
    await page.goto("/user/dashboard");
    await waitForWebSocket(page);
    await unlockVoice(page);

    await demoDrive(page.request, { ...VEH, action: "enter", bay_id: "SP-11" });
    await expect(page.locator("text=Wrong Space Warning")).toBeVisible({ timeout: 10000 });
    const [ep] = await getEpisodes(page.request, true);
    await advanceViolationClock(page.request, 300, ep.episode_id);
    await ctx.takeScreenshot("wrong_bay_at_minute_5");

    // User action: the driver relocates (button drives the simulated vehicle SP-11 -> SP-07 in the backend).
    await page.getByRole("button", { name: /MOVE TO C7/i }).click();
    await expect(page.locator("text=Wrong Space Warning")).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator("text=ACTIVE SESSION").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main")).toContainText(/00:00:0\d/);
    await ctx.takeScreenshot("relocated_to_sp07_fresh_timer");

    const all = await getEpisodes(page.request, false);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ episode_id: ep.episode_id, state: "RESOLVED", resolution_reason: "left_bay" });

    // Accelerating past 10 minutes must not escalate a resolved episode.
    const later = await advanceViolationClock(page.request, 700);
    expect(later.emitted_events).toHaveLength(0);
    await page.waitForTimeout(1500);
    await expect(page.locator("text=PARKING VIOLATION")).toHaveCount(0);
    expect((await getEpisodes(page.request, true))).toHaveLength(0);
    await ctx.finish();
  });
});
