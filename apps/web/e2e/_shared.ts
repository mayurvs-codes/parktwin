/* eslint-disable @typescript-eslint/no-explicit-any */
import { Page, expect } from "@playwright/test";

export const WRONG_BAY_TEXT = "Warning! This is not your designated parking space. Please move to space C7.";

/** Driver VEH-001 (designated SP-07) — the same track id the driver-portal demo buttons use. */
export const VEH = { vehicle_id: "VEH-001", track_id: 9001, assigned_bay: "SP-07" };

export async function spokenTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => ((window as any).__spokenUtterances || []).map((u: any) => u.text));
}

export async function expectNoWrongBayWarningInUi(page: Page): Promise<void> {
  await expect(page.locator("text=Wrong Space Warning")).toHaveCount(0);
  await expect(page.locator("[data-testid='announcement-log-panel']")).not.toContainText("not your designated parking space");
}

/** Read the number printed right after a label inside <main> (e.g. "Occupied Slots\n21"). */
export async function numberAfter(page: Page, label: string): Promise<number> {
  const text = await page.locator("main").innerText();
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = text.match(new RegExp(escaped + "\\s*\\n?\\s*(\\d+)", "i"));
  expect(m, `label "${label}" followed by a number`).not.toBeNull();
  return Number(m![1]);
}
