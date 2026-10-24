import { test, expect } from "@playwright/test";
import { setupE2E, waitForWebSocket, getSpokenUtterances, getSpeakCallCount, BACKEND_URL } from "./test-helpers";

test.describe("B15 — Voice blocked / unlock flow", () => {
  test("B15: Initially blocked voice displays visible text fallback and Enable Voice CTA, unlocking enables audio speech", async ({ page }) => {
    const ctx = await setupE2E(page, "B15");

    await page.goto("/user/dashboard");
    await waitForWebSocket(page);
    await ctx.takeScreenshot("initial_blocked_state");

    // 1. Assert Enable Voice CTA is prominently visible before unlock
    const enableBtn = page.getByRole("button", { name: /Enable Voice/i });
    await expect(enableBtn).toBeVisible({ timeout: 5000 });

    // 2. Assert voice state is initially blocked
    const initialVoiceState = await page.evaluate(() => {
      const vs = (window as any).__useVoiceStore?.getState();
      return { status: vs?.status, isUnlocked: vs?.isUnlocked };
    });
    expect(initialVoiceState.status).toBe("blocked");
    expect(initialVoiceState.isUnlocked).toBe(false);

    // 3. Send announcement while voice is blocked — must display on screen as visual fallback
    const assignRes = await page.request.post(`${BACKEND_URL}/violations/test/trigger-anpr-assignment`, {
      data: {
        camera_id: "CAM-01",
        vehicle_id: "VEH-BLOCKED-01",
        assigned_bay: "SP-07",
        source: "demo",
      },
    });
    expect(assignRes.ok()).toBeTruthy();

    // Verify visible text fallback in announcement log panel
    const logPanel = page.locator("[data-testid='announcement-log-panel']");
    await expect(logPanel).toBeVisible({ timeout: 10000 });
    await expect(logPanel).toContainText("Verification successful. Welcome User A. Your place is C7.");
    await ctx.takeScreenshot("visual_fallback_announcement");

    // Speak count should be 0 before user gesture unlock
    const preUnlockSpeaks = await getSpeakCallCount(page);
    expect(preUnlockSpeaks).toBe(0);

    // 4. User clicks "Enable Voice" CTA button to unlock Web Speech autoplay
    await enableBtn.click();

    // Verify UI reflects VOICE ACTIVE
    await expect(page.locator("text=VOICE ACTIVE")).toBeVisible({ timeout: 5000 });
    await ctx.takeScreenshot("voice_unlocked_active");

    const postUnlockState = await page.evaluate(() => {
      const vs = (window as any).__useVoiceStore?.getState();
      return { status: vs?.status, isUnlocked: vs?.isUnlocked };
    });
    expect(postUnlockState.isUnlocked).toBe(true);
    expect(postUnlockState.status).toBe("enabled");

    // 5. Send second announcement — must now trigger speech synthesis audio
    // Simulated vehicle starts into the wrong bay; the backend detector raises the warning.
    await page.request.post(`${BACKEND_URL}/violations/demo/drive`, {
      data: { action: "enter", bay_id: "SP-11", assigned_bay: "SP-07", vehicle_id: "VEH-001", track_id: 9001 },
    });

    await page.waitForFunction(
      () => (window as any).__spokenUtterances?.some((u: any) => u.text.includes("designated parking space")),
      { timeout: 5000 }
    ).catch(() => {});

    const spoken = await getSpokenUtterances(page);
    const spokenWarning = spoken.find((u) => u.text.includes("designated parking space"));
    expect(spokenWarning).toBeDefined();
    expect(spokenWarning!.text).toContain("Warning! This is not your designated parking space. Please move to space C7.");

    const finalSpeaks = await getSpeakCallCount(page);
    expect(finalSpeaks).toBeGreaterThanOrEqual(1);

    await ctx.finish();
  });
});

test.describe("B15b — Browser without speech support", () => {
  test("B15b: with no speechSynthesis API the portal reports voice unavailable and still shows the text", async ({ page }) => {
    // Emulates a browser that ships without the Web Speech API (Chromium has no switch to remove it).
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).speechSynthesis;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).SpeechSynthesisUtterance;
    });
    const ctx = await setupE2E(page, "B15b");
    await page.goto("/user/dashboard");
    await waitForWebSocket(page);

    await page.request.post(`${BACKEND_URL}/violations/test/trigger-anpr-assignment`, {
      data: { camera_id: "CAM-01", vehicle_id: "VEH-NOSPEECH-01", assigned_bay: "SP-07", source: "demo" },
    });
    const logPanel = page.locator("[data-testid='announcement-log-panel']");
    await expect(logPanel).toContainText("Verification successful. Welcome User A. Your place is C7.", { timeout: 10000 });
    await expect(page.locator("main")).toContainText(/unavailable/i);
    await ctx.takeScreenshot("no_speech_support_text_fallback");
    await ctx.finish();
  });
});
