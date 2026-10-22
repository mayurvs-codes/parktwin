import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, demoDrive, getEpisodes, advanceViolationClock } from "./test-helpers";
import { VEH } from "./_shared";

/* eslint-disable @typescript-eslint/no-explicit-any */
test.describe("B08 — Wrong-bay 10-minute escalation", () => {
  test("B08 [time-acceleration hook]: 599 s does not escalate; 601 s raises exactly one admin PARKING VIOLATION alert", async ({ page }) => {
    const ctx = await setupE2E(page, "B08");
    await page.goto("/digital-twin");
    await waitForWebSocket(page);

    await demoDrive(page.request, { ...VEH, action: "enter", bay_id: "SP-11" });
    const [ep] = await getEpisodes(page.request, true);

    const at599 = await advanceViolationClock(page.request, 599, ep.episode_id);
    expect(at599.emitted_events.some((e: any) => e.event_type === "WRONG_BAY_ESCALATED")).toBe(false);
    await expect(page.locator("[data-testid='operational-violation-alert']")).toHaveCount(0);
    await ctx.takeScreenshot("admin_twin_599s_no_escalation");

    const at601 = await advanceViolationClock(page.request, 601, ep.episode_id);
    // At most one escalation event (the real-time violation clock may emit it a moment earlier).
    expect(at601.emitted_events.filter((e: any) => e.event_type === "WRONG_BAY_ESCALATED").length).toBeLessThanOrEqual(1);

    const alert = page.locator("[data-testid='operational-violation-alert']");
    await expect(alert).toHaveCount(1, { timeout: 10000 });
    await expect(alert).toContainText("PARKING VIOLATION");
    await expect(alert).toContainText("VEH-001");
    await expect(alert).toContainText("C7");
    await expect(alert).toContainText("D3");
    await expect(alert).toContainText("10:00+");
    await ctx.takeScreenshot("admin_twin_601s_escalated");

    const [after] = await getEpisodes(page.request, true);
    expect(after.state).toBe("ESCALATED");
    expect(after.duration_seconds).toBeGreaterThanOrEqual(600);
    await ctx.finish();
  });
});
