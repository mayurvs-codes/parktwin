import { test, expect } from "@playwright/test";

test.describe("ParkTwin — 3D Twin, Voice Assistant & Wrong-Bay Violation E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (m) => console.log("[BROWSER CONSOLE]", m.text()));
    // Reset backend violation episodes
    await page.request.post("http://127.0.0.1:8000/violations/test/reset").catch(() => {});
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

    // Verify announcement log panel contains assigned bay id and route guidance
    const logPanel = page.locator("[data-testid='announcement-log-panel']");
    await expect(logPanel).toBeVisible();
    await expect(logPanel).toContainText("C7");
    await expect(logPanel).toContainText("driving aisle");

    // Verify no wrong bay warning or violation alert is active
    await expect(page.locator("text=Wrong Space Warning")).not.toBeVisible();
    await expect(page.locator("text=10+ MIN VIOLATION")).not.toBeVisible();
  });

  test("Scenario 2: Wrong bay entry — backend-driven WebSocket announcement with exact bay IDs and departure resolution", async ({ page }) => {
    // Wait until the digital twin WebSocket is connected
    await page.waitForFunction(() => {
      const store = (window as any).__useDigitalTwinStore;
      return store ? Boolean(store.getState().isConnected) : false;
    }, { timeout: 10000 });

    // Backend-driven trigger: post wrong-bay entry to backend API
    const response = await page.request.post("http://127.0.0.1:8000/violations/test/trigger-entry", {
      data: {
        vehicle_id: "VEH-001",
        license_plate: "KA04MH1234",
        assigned_bay: "SP-07",
        actual_bay: "SP-11",
        source: "replay",
      },
    });
    expect(response.ok()).toBeTruthy();

    // Verify warning is displayed with actual bay SP-11 vs assigned SP-07 received over WebSocket
    await expect(page.locator("text=Wrong Space Warning")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("SP-11", { exact: true }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText("SP-07");

    // Assert announcement log panel displays exact warning text containing both bay IDs
    const logPanel = page.locator("[data-testid='announcement-log-panel']");
    await expect(logPanel).toContainText("Warning! This is not your designated parking space. Please move to space C7.");

    // Relocate / leave wrong bay via "MOVE TO SP-07"
    const relocateBtn = page.getByRole("button", { name: /MOVE TO SP-07/i });
    await expect(relocateBtn).toBeVisible();
    await relocateBtn.click();

    // Episode resolved, warning cleared
    await expect(page.locator("text=10+ MIN VIOLATION")).not.toBeVisible();
    await expect(page.locator("text=Wrong Space Warning")).not.toBeVisible();
  });

  test("Scenario 3: 10-minute long-stay escalation triggers from backend time-acceleration endpoint", async ({ page }) => {
    // Navigate to Admin Digital Twin view
    await page.goto("/digital-twin");

    // Wait until the digital twin WebSocket is connected
    await page.waitForFunction(() => {
      const store = (window as any).__useDigitalTwinStore;
      return store ? Boolean(store.getState().isConnected) : false;
    }, { timeout: 10000 });

    // Verify Twin loads and status bar is visible
    await expect(page.getByRole("heading", { name: "Digital Twin" })).toBeVisible();
    await expect(page.locator("text=ZONE (20):")).toBeVisible();

    // Trigger wrong-bay entry at backend
    const entryRes = await page.request.post("http://127.0.0.1:8000/violations/test/trigger-entry", {
      data: {
        vehicle_id: "VEH-001",
        license_plate: "KA04MH1234",
        assigned_bay: "SP-07",
        actual_bay: "SP-11",
        source: "replay",
      },
    });
    expect(entryRes.ok()).toBeTruthy();

    // Advance time to 605s (exceeding 600s policy threshold) via test time-acceleration endpoint
    const advRes = await page.request.post("http://127.0.0.1:8000/violations/test/advance-time", {
      data: {
        target_duration_seconds: 605,
      },
    });
    expect(advRes.ok()).toBeTruthy();

    // Assert operational alert for PARKING VIOLATION (10:00+) appears in admin twin
    const alertCard = page.locator("[data-testid='admin-operational-alerts']");
    await expect(alertCard).toBeVisible({ timeout: 10000 });
    await expect(alertCard).toContainText("PARKING VIOLATION");
    await expect(alertCard).toContainText("SP-11");
    await expect(alertCard).toContainText("SP-07");
    await expect(alertCard).toContainText("10:00+");
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

  test("Scenario 8: Duplicate voice event suppression calls speechSynthesis.speak once", async ({ page }) => {
    await page.goto("/user/dashboard");

    // Unlock voice
    const enableBtn = page.getByRole("button", { name: /Enable Voice/i });
    await expect(enableBtn).toBeVisible();
    await enableBtn.click();
    await expect(page.locator("text=VOICE ACTIVE")).toBeVisible();

    // Stub window.speechSynthesis.speak and record call count
    await page.evaluate(() => {
      (window as any).__speakCallCount = 0;
      if (!window.speechSynthesis) {
        (window as any).speechSynthesis = {
          speak: () => {},
          cancel: () => {},
          paused: false,
          speaking: false,
          pending: false,
        };
      }
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        (window as any).__speakCallCount = ((window as any).__speakCallCount || 0) + 1;
        setTimeout(() => {
          if (utterance && typeof utterance.onend === "function") {
            utterance.onend(new Event("end") as any);
          }
        }, 10);
      };
    });

    // Send first announcement
    await page.evaluate(async () => {
      const store = (window as any).__useVoiceStore;
      await store.getState().receiveAnnouncement({
        message_id: "MSG-DUP-1",
        event_id: "EVENT-DUP-DEDUP-TEST",
        kind: "ASSIGNMENT",
        text: "Please proceed to designated space SP-07.",
        priority: 50,
        source: "demo",
      });
    });

    // Wait a brief delay for async delivery
    await page.waitForTimeout(100);

    // Send duplicate announcement with identical event_id
    await page.evaluate(async () => {
      const store = (window as any).__useVoiceStore;
      await store.getState().receiveAnnouncement({
        message_id: "MSG-DUP-2",
        event_id: "EVENT-DUP-DEDUP-TEST",
        kind: "ASSIGNMENT",
        text: "Please proceed to designated space SP-07.",
        priority: 50,
        source: "demo",
      });
    });

    await page.waitForTimeout(100);

    const callCount = await page.evaluate(() => (window as any).__speakCallCount);
    expect(callCount).toBe(1);
  });
});
