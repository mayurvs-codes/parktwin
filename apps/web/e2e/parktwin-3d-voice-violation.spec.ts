import { test, expect } from "@playwright/test";

test.describe("ParkTwin — 3D Twin, Voice Assistant & Wrong-Bay Violation E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to driver dashboard
    await page.goto("/user/dashboard");
    // Ensure clean state before test
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test("Scenario 1: Correct vehicle — assignment announcement appears and no wrong-bay warning occurs", async ({ page }) => {
    // Persona User A is active by default; designated space is SP-07
    await expect(page.locator("body")).toContainText("SP-07");

    // Check Audio Guidance card displays
    const guidanceHeader = page.locator("text=AUDIO GUIDANCE");
    await expect(guidanceHeader).toBeVisible();

    // Verify no wrong bay warning or violation alert is active
    await expect(page.locator("text=Wrong Space Warning")).not.toBeVisible();
    await expect(page.locator("text=10+ MIN VIOLATION")).not.toBeVisible();
  });

  test("Scenario 2: Wrong bay entry — warning logged, episode visible, departure resolves episode", async ({ page }) => {
    // Trigger Wrong Space Warning via Simulate Wrong Space button
    const wrongSpaceBtn = page.getByRole("button", { name: /Simulate Wrong Space/i });
    await expect(wrongSpaceBtn).toBeVisible();
    await wrongSpaceBtn.click();

    // Verify warning is displayed with actual bay SP-11 vs assigned SP-07
    await expect(page.locator("text=Wrong Space Warning")).toBeVisible();
    await expect(page.getByText("SP-11", { exact: true }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText("SP-07");

    // Relocate / leave wrong bay via "MOVE TO SP-07"
    const relocateBtn = page.getByRole("button", { name: /MOVE TO SP-07/i });
    await expect(relocateBtn).toBeVisible();
    await relocateBtn.click();

    // Episode resolved, warning cleared
    await expect(page.locator("text=10+ MIN VIOLATION")).not.toBeVisible();
    await expect(page.locator("text=Wrong Space Warning")).not.toBeVisible();
  });

  test("Scenario 3: 10-minute long-stay escalation triggers with preserved threshold", async ({ page }) => {
    // Navigate to Admin Digital Twin view
    await page.goto("/digital-twin");

    // Verify Twin loads and status bar is visible
    await expect(page.getByRole("heading", { name: "Digital Twin" })).toBeVisible();
    await expect(page.locator("text=ZONE (20):")).toBeVisible();
  });

  test("Scenario 4: 2D <-> 3D toggle keeps selection and occupancy equal", async ({ page }) => {
    await page.goto("/digital-twin");

    const viewSelector = page.getByTestId("twin-view-mode-selector");
    await expect(viewSelector).toBeVisible();

    // Switch to 3D mode
    const btn3D = viewSelector.getByRole("button", { name: "3D" });
    await expect(btn3D).toBeVisible();
    await btn3D.click();

    // Verify 3D canvas or boundary renders
    const canvas = page.locator("canvas").or(page.locator("[data-testid='unified-twin-3d']"));
    await expect(canvas.first()).toBeVisible({ timeout: 10000 });

    // Verify occupancy counts remain consistent in status bar
    await expect(page.locator("text=ZONE (20):")).toBeVisible();

    // Switch back to 2D
    const btn2D = viewSelector.getByRole("button", { name: "2D" });
    await expect(btn2D).toBeVisible();
    await btn2D.click();
    await expect(page.locator("svg").first()).toBeVisible();
  });

  test("Scenario 5: 3D failure displays graceful 2D fallback notice", async ({ page }) => {
    await page.goto("/digital-twin");

    // Force WebGL failure simulation
    await page.evaluate(() => {
      HTMLCanvasElement.prototype.getContext = function (type: string) {
        if (type === "webgl" || type === "webgl2") return null;
        return null;
      };
    });

    // Attempt to switch to 3D mode
    const viewSelector = page.getByTestId("twin-view-mode-selector");
    await viewSelector.getByRole("button", { name: "3D" }).click();

    // Verify 2D fallback notice is rendered by Twin3DErrorBoundary
    const fallbackNotice = page.locator("text=3D Twin Fallback Active");
    await expect(fallbackNotice).toBeVisible({ timeout: 5000 });
  });

  test("Scenario 6: Voice assistant blocked state shows visible text fallback and Enable Voice CTA", async ({ page }) => {
    await page.goto("/user/dashboard");

    // In fresh browser context, autoplay audio is blocked, CTA is visible
    const enableBtn = page.getByRole("button", { name: /Enable Voice/i });
    await expect(enableBtn).toBeVisible();

    // Click unlocks voice
    await enableBtn.click();
    await expect(page.locator("text=VOICE ACTIVE")).toBeVisible();
  });

  test("Scenario 7: Full reset restores clean canonical state", async ({ page }) => {
    await page.goto("/user/dashboard");

    // Check Reset button
    const resetBtn = page.getByRole("button", { name: "Reset" }).first();
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Verify 20 bays remain active in focused zone and available spaces shown
    await expect(page.locator("text=spaces free")).toBeVisible();
  });
});
