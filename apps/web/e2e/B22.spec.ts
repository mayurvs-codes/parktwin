import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, unlockVoice, getSpokenUtterances } from "./test-helpers";

test.describe("B22 — Wrong-bay call after 2 s, admin notified 5 s later", () => {
  test("B22: driver gets the call ~2 s after parking in the wrong bay; the admin is told the car has not moved ~5 s after that", async ({ page }) => {
    test.setTimeout(90_000);
    const ctx = await setupE2E(page, "B22");

    await page.goto("/user/dashboard");
    await waitForWebSocket(page);
    await unlockVoice(page);
    await page.getByRole("button", { name: /^Reset$/ }).click();
    await page.waitForTimeout(1500);

    // Admin sits on the digital twin in another tab of the same browser.
    const admin = await page.context().newPage();
    await admin.goto("/digital-twin");
    await expect(admin.locator("main")).toContainText(/total occ/i, { timeout: 30_000 });
    await expect(admin.getByTestId("admin-not-moved-banner")).toHaveCount(0);

    // The driver parks in the wrong bay (demo button).
    const t0 = Date.now();
    await page.getByRole("button", { name: /Simulate Wrong Space/i }).click();

    // 1 s in: no call yet (it arrives at 2 s).
    await page.waitForTimeout(1000);
    await expect(page.getByTestId("driver-call-banner")).toHaveCount(0);
    expect((await getSpokenUtterances(page)).filter((u) => u.text.includes("not your designated"))).toHaveLength(0);

    // The call: banner + spoken warning with directions, about 2 s after parking.
    await expect(page.getByTestId("driver-call-banner")).toBeVisible({ timeout: 3000 });
    const callAt = Date.now() - t0;
    expect(callAt).toBeGreaterThanOrEqual(1700);
    expect(callAt).toBeLessThan(4500);
    await expect(page.getByTestId("driver-call-banner")).toContainText("Please move to space C7");
    const spoken = (await getSpokenUtterances(page)).filter((u) => u.text.includes("not your designated"));
    expect(spoken).toHaveLength(1); // the backend's own immediate warning is not spoken a second time
    expect(spoken[0]!.text).toContain("Bay C7 will be on your");
    await ctx.takeScreenshot("driver_call_at_2s");

    // Admin has not been told yet at about 4-5 s...
    await admin.waitForTimeout(Math.max(0, 5000 - (Date.now() - t0)));
    await expect(admin.getByTestId("admin-not-moved-banner")).toHaveCount(0);

    // ...and is notified 5 s after the call (about 7 s after parking).
    await expect(admin.getByTestId("admin-not-moved-banner")).toBeVisible({ timeout: 6000 });
    const notifiedAt = Date.now() - t0;
    expect(notifiedAt).toBeGreaterThanOrEqual(6500);
    expect(notifiedAt).toBeLessThan(10_000);
    await expect(admin.getByTestId("admin-not-moved-banner")).toContainText("has not moved from bay D3");
    await expect(admin.getByTestId("admin-not-moved-banner")).toContainText("Expected bay C7");
    await expect(admin.getByTestId("admin-operational-alerts")).toContainText("VEHICLE NOT MOVED");
    await ctx.takeScreenshot("driver_after_admin_notified");

    // Driver moves to the right bay: the admin notification clears.
    await page.getByRole("button", { name: /MOVE TO C7/i }).click();
    await expect(admin.getByTestId("admin-not-moved-banner")).toHaveCount(0, { timeout: 15_000 });

    await ctx.finish();
  });

  test("B22b: no call and no admin notification when the driver moves within 2 s", async ({ page }) => {
    test.setTimeout(60_000);
    const ctx = await setupE2E(page, "B22b");
    await page.goto("/user/dashboard");
    await waitForWebSocket(page);
    await unlockVoice(page);
    await page.getByRole("button", { name: /^Reset$/ }).click();
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /Simulate Wrong Space/i }).click();
    await page.getByRole("button", { name: /Clear Violation/i }).click();
    await page.waitForTimeout(9000);
    await expect(page.getByTestId("driver-call-banner")).toHaveCount(0);
    await expect(page.getByTestId("admin-not-moved-banner")).toHaveCount(0);
    expect((await getSpokenUtterances(page)).filter((u) => u.text.includes("not your designated"))).toHaveLength(0);
    await ctx.finish();
  });
});
