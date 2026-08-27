"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type PollingIntervalPreference = 5000 | 10000 | 30000;

export interface UserPreferences {
  theme: ThemePreference;
  pollingInterval: PollingIntervalPreference;
  defaultCameraId: string | null;
  compactMode: boolean;
  showNotifications: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  pollingInterval: 5000,
  defaultCameraId: null,
  compactMode: false,
  showNotifications: true,
};

const PREFS_KEY = "parktwin_prefs";
const PREFS_EVENT = "parktwin_prefs_changed";

/** Read preferences from localStorage with fallback to DEFAULT_PREFERENCES. */
export function getPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme ?? DEFAULT_PREFERENCES.theme,
      pollingInterval: parsed.pollingInterval ?? DEFAULT_PREFERENCES.pollingInterval,
      defaultCameraId: parsed.defaultCameraId ?? DEFAULT_PREFERENCES.defaultCameraId,
      compactMode: typeof parsed.compactMode === "boolean" ? parsed.compactMode : DEFAULT_PREFERENCES.compactMode,
      showNotifications: typeof parsed.showNotifications === "boolean" ? parsed.showNotifications : DEFAULT_PREFERENCES.showNotifications,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Update preferences in localStorage (partial update) and dispatch event. */
export function setPreferences(partial: Partial<UserPreferences>): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  const current = getPreferences();
  const next: UserPreferences = { ...current, ...partial };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PREFS_EVENT));
  } catch (err) {
    console.error("Failed to save preferences to localStorage:", err);
  }
  return next;
}

/** Reset preferences in localStorage to defaults and dispatch event. */
export function resetPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    window.dispatchEvent(new Event(PREFS_EVENT));
  } catch (err) {
    console.error("Failed to reset preferences in localStorage:", err);
  }
  return DEFAULT_PREFERENCES;
}

export interface UsePreferencesResult {
  preferences: UserPreferences;
  pollingInterval: PollingIntervalPreference;
  theme: ThemePreference;
  defaultCameraId: string | null;
  compactMode: boolean;
  showNotifications: boolean;
  setPreferences: (partial: Partial<UserPreferences>) => UserPreferences;
  resetPreferences: () => UserPreferences;
  getPreferences: () => UserPreferences;
}

/**
 * Custom React hook backing user preferences with localStorage.
 * Listens for local and cross-tab storage changes to stay reactively in sync.
 */
export function usePreferences(): UsePreferencesResult {
  const [preferences, setPreferencesState] = useState<UserPreferences>(getPreferences);

  useEffect(() => {
    // Initial client-side sync
    setPreferencesState(getPreferences());

    const handleSync = () => {
      setPreferencesState(getPreferences());
    };

    window.addEventListener(PREFS_EVENT, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener(PREFS_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const update = useCallback((partial: Partial<UserPreferences>) => {
    const updated = setPreferences(partial);
    setPreferencesState(updated);
    return updated;
  }, []);

  const reset = useCallback(() => {
    const resetValues = resetPreferences();
    setPreferencesState(resetValues);
    return resetValues;
  }, []);

  return {
    preferences,
    pollingInterval: preferences.pollingInterval,
    theme: preferences.theme,
    defaultCameraId: preferences.defaultCameraId,
    compactMode: preferences.compactMode,
    showNotifications: preferences.showNotifications,
    setPreferences: update,
    resetPreferences: reset,
    getPreferences,
  };
}

export default usePreferences;
