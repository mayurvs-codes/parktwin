import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, demoDrive, getEpisodes, advanceViolationClock } from "./test-helpers";
import { VEH } from "./_shared";

/**
 * PARTIAL by design: the authorised long-stay alert is computed by the browser demo store
 * (driver session timer). The backend part proves the rule that matters for violations:
 * a vehicle in its own designated bay never opens a wrong-bay episode, however long it stays.
 */
test.describe("B11 — Authorised long stay", () => {
  test("B11 [time-acceleration]: 10+ min in designated SP-07 shows LONG-STAY alert, never a wrong-bay alert", async ({ page }) => {
    const ctx = await setupE2E(page, "B11");
    await page.goto("/user/dashboard");
    await waitForWebSocket(page);

    // Backend: the simulated vehicle parks in its own bay.
    const drive = await demoDrive(page.request, { ...VEH, action: "enter", bay_id: "SP-07" });
    expect(drive.warning_frame).toBeNull();

    // Driver journey through the UI: navigate, park, then accelerate the session timer to 10 min.
    await page.getByRole("button", { name: /NAVIGATE TO C7/i }).click();
    await page.getByRole("button", { name: /PARK VEHICLE/i }).click();
    await expect(page.locator("text=ACTIVE SESSION").first()).toBeVisible({ timeout: 10000 });
    await page.getByTitle("Set duration to 10 minutes (Long-Stay Alert)").first().click();
    await expect(page.locator("text=LONG-STAY DURATION ALERT").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Wrong Space Warning")).toHaveCount(0);
    await ctx.takeScreenshot("long_stay_alert_in_designated_bay");

    const later = await advanceViolationClock(page.request, 700);
    expect(later.emitted_events).toHaveLength(0);
    expect(await getEpisodes(page.request, false)).toHaveLength(0);
    await ctx.finish();
  });
});
