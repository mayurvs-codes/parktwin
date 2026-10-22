import { test, expect } from "@playwright/test";
import { setupE2E, assertCanvasRendersPixels } from "./test-helpers";

test.describe("B21 — Separate 3D digital twin page", () => {
  test("B21: /digital-twin-3d renders the facility, counts agree, and picking a free bay flies to it and selects it", async ({ page }) => {
    test.setTimeout(120_000);
    const ctx = await setupE2E(page, "B21");

    // Reached from the admin sidebar like any other page.
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "3D Twin" }).first().click();
    await expect(page).toHaveURL(/\/digital-twin-3d$/);

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("twin3d-page")).toBeVisible();
    await page.waitForTimeout(4000); // let the first frames draw (software WebGL)
    const bytes = await assertCanvasRendersPixels(page, "canvas");
    await ctx.takeScreenshot(`overview_${bytes}_bytes`);

    // Counts: free + occupied never exceed the 60 bays, and the free list matches the free count.
    const free = Number(await page.getByTestId("twin3d-free-count").innerText());
    const occupied = Number(await page.getByTestId("twin3d-occupied-count").innerText());
    expect(free).toBeGreaterThan(0);
    expect(occupied).toBeGreaterThan(0);
    expect(free + occupied).toBeLessThanOrEqual(60);
    const freeButtons = page.locator("aside button", { hasText: /^[A-I]\d{1,2}$/ });
    await expect(freeButtons).toHaveCount(free);

    // Pick a free bay from the list: it becomes the selected bay, reported as Free.
    const first = freeButtons.first();
    const name = (await first.innerText()).trim();
    await first.click();
    const selected = page.getByTestId("twin3d-selected");
    await expect(selected).toContainText(name);
    await expect(selected).toContainText("Free");
    await page.waitForTimeout(2500); // camera fly-in
    await assertCanvasRendersPixels(page, "canvas");
    await ctx.takeScreenshot(`flew_to_${name}`);

    // The same selection is shared with the 2D twin.
    await page.goto("/digital-twin");
    await expect(page.locator("main")).toContainText(new RegExp(`Bay: ${name} · ID SP-[0-9]{2}`), { timeout: 20_000 });
    await ctx.takeScreenshot("selection_in_2d");
    await ctx.finish();
  });
});
