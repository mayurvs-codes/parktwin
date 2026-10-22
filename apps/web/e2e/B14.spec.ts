import { test, expect, chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { FRONTEND_URL, EVIDENCE_BASE, ensureServersRunning } from "./test-helpers";

test.describe("B14 — 3D failure fallback", () => {
  test("B14: a browser launched without WebGL shows the fallback notice and a working 2D twin", async ({ request }) => {
    await ensureServersRunning(request);
    // Real failure: Chromium started with WebGL disabled (no getContext monkeypatching).
    const browser = await chromium.launch({ args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: path.join(EVIDENCE_BASE, "B14") } });
    const page = await context.newPage();
    const dir = path.join(EVIDENCE_BASE, "B14");
    fs.mkdirSync(dir, { recursive: true });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    try {
      expect(await page.evaluate(() => !!document.createElement("canvas").getContext("webgl"))).toBe(false);
      await page.goto(`${FRONTEND_URL}/digital-twin`);
      await page.getByTestId("twin-view-mode-selector").getByRole("button", { name: "3D" }).click();

      await expect(page.locator("text=3D Twin Fallback Active")).toBeVisible({ timeout: 15000 });
      await expect(page.locator("main")).toContainText("Showing authoritative 2D Digital Twin");
      await page.screenshot({ path: path.join(dir, "01_fallback_notice.png"), fullPage: true });

      // The 2D twin underneath still works: select SP-01 by clicking it.
      await page.locator("[data-testid='twin-slot-SP-01']").first().dispatchEvent("click");
      await expect(page.locator("main")).toContainText(/Assigned Space\s*C1/);
      await page.screenshot({ path: path.join(dir, "02_2d_twin_usable.png"), fullPage: true });
      expect(errors).toEqual([]);
    } finally {
      await context.close();
      await browser.close();
    }
  });
});
