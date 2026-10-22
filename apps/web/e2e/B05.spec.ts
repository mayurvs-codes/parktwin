import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, unlockVoice, demoDrive, getEpisodes, getAnnouncements } from "./test-helpers";
import { VEH, WRONG_BAY_TEXT, spokenTexts } from "./_shared";

test.describe("B05 — Wrong-bay entry (early warning)", () => {
  test("B05: simulated vehicle starting into SP-11 is warned once, before the bay is fully occupied", async ({ page }) => {
    const ctx = await setupE2E(page, "B05");
    await page.goto("/user/dashboard");
    await waitForWebSocket(page);
    await unlockVoice(page);
    await ctx.takeScreenshot("driver_portal_ready");

    const drive = await demoDrive(page.request, { ...VEH, action: "enter", bay_id: "SP-11" });
    // Ordering proof from the backend detector: warning raised while ENTERING, before INSIDE.
    expect(drive.warning_frame).not.toBeNull();
    expect(drive.occupied_frame).not.toBeNull();
    expect(drive.warning_frame).toBeLessThan(drive.occupied_frame);

    await expect(page.locator("text=Wrong Space Warning")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=IMMEDIATE WARNING")).toBeVisible();
    const log = page.locator("[data-testid='announcement-log-panel']");
    await expect(log).toContainText(WRONG_BAY_TEXT);
    await expect(log.locator("[data-testid='announcement-log-item']").filter({ hasText: "not your designated" })).toHaveCount(1);
    await ctx.takeScreenshot("wrong_bay_warning_shown");

    await expect
      .poll(async () => (await spokenTexts(page)).filter((t) => t === WRONG_BAY_TEXT).length, { timeout: 5000 })
      .toBe(1);

    const episodes = await getEpisodes(page.request, true);
    expect(episodes).toHaveLength(1);
    expect(episodes[0]).toMatchObject({
      vehicle_id: "VEH-001",
      assigned_bay: "SP-07",
      actual_bay: "SP-11",
      state: "WARNED",
      source: "demo",
    });
    const warnings = (await getAnnouncements(page.request)).filter((a) => a.kind === "WRONG_BAY_WARNING");
    expect(warnings).toHaveLength(1);
    // Backend text keeps the internal bay id; the UI/voice relabels it (SP-07 -> B7).
    expect(warnings[0].text).toBe(WRONG_BAY_TEXT.replace("C7", "SP-07"));
    await ctx.finish();
  });
});
