import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, getSpokenUtterances, BACKEND_URL } from "./test-helpers";

test.describe("B01 — Vehicle recognised -> assignment", () => {
  test("B01 [simulated ANPR result]: gate assignment triggers spoken guidance and route display matching backend log", async ({ page }) => {
    const ctx = await setupE2E(page, "B01");

    await page.goto("/user/dashboard");
    await ctx.takeScreenshot("initial_dashboard");

    await waitForWebSocket(page);
    await page.getByRole("button", { name: /Enable Voice/i }).click();
    await expect(page.locator("text=VOICE ACTIVE")).toBeVisible();
    await ctx.takeScreenshot("voice_unlocked_and_connected");

    // Backend receives ANPR assignment for known vehicle VEH-001 to SP-07
    const anprRes = await page.request.post(`${BACKEND_URL}/violations/test/trigger-anpr-assignment`, {
      data: {
        camera_id: "CAM-01",
        vehicle_id: "VEH-001",
        assigned_bay: "SP-07",
        source: "demo",
      },
    });
    expect(anprRes.ok()).toBeTruthy();
    const anprData = await anprRes.json();
    expect(anprData.success).toBeTruthy();
    const backendAnnouncement = anprData.announcement;
    expect(backendAnnouncement.kind).toBe("ASSIGNMENT");
    expect(backendAnnouncement.vehicle_id).toBe("VEH-001");

    // UI assertions: browser shows assigned bay ID SP-07 and route in announcement panel
    await expect(page.locator("body")).toContainText("SP-07");
    const logPanel = page.locator("[data-testid='announcement-log-panel']");
    await expect(logPanel).toBeVisible({ timeout: 10000 });
    await expect(logPanel).toContainText("C7");
    await expect(logPanel).toContainText("driving aisle");
    await ctx.takeScreenshot("assignment_announcement_received");

    await page.waitForFunction(() => (window as any).__spokenUtterances?.some((u: any) => u.text.includes("C7")), { timeout: 5000 }).catch(() => {});
    const spoken = await getSpokenUtterances(page);
    const spokenAssignment = spoken.find((u) => u.text.includes("C7"));
    expect(spokenAssignment).toBeDefined();
    expect(spokenAssignment!.text).toContain("Vehicle recognised. Your designated parking space is C7.");

    // Backend state assertion: /violations/announcements matches UI text
    const logRes = await page.request.get(`${BACKEND_URL}/violations/announcements`);
    expect(logRes.ok()).toBeTruthy();
    const logData = await logRes.json();
    expect(logData.announcements.length).toBeGreaterThanOrEqual(1);
    const backendLogged = logData.announcements.find((a: any) => a.kind === "ASSIGNMENT" && a.vehicle_id === "VEH-001");
    expect(backendLogged).toBeDefined();
    // Backend keeps the internal id (SP-07); the spoken/UI text shows the row label (B7).
    expect(backendLogged.text.replace("SP-07", "C7")).toBe(spokenAssignment!.text);

    await ctx.finish();
  });
});
