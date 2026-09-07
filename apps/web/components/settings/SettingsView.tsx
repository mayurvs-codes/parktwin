"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Cpu,
  FileText,
  Layers,
  ParkingSquare,
  RotateCcw,
  Save,
  Server,
  Settings as SettingsIcon,
  Sliders,
} from "lucide-react";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectResetButton } from "@/components/dashboard/ProjectResetButton";
import { useSystemSettings } from "@/hooks/useSettings";
import {
  type PollingIntervalPreference,
  type ThemePreference,
  type UserPreferences,
  usePreferences,
} from "@/store/preferences";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";

export function SettingsView() {
  const { data: systemSettings, isLoading, isError, refetch } = useSystemSettings();
  const { preferences, setPreferences, resetPreferences } = usePreferences();
  const { setTheme } = useTheme();

  // Local draft state for preferences form
  const [draft, setDraft] = useState<UserPreferences>(preferences);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Sync draft with preferences when store updates
  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const handleSave = () => {
    setPreferences(draft);
    setTheme(draft.theme);
    setSaveSuccess(true);
    setResetSuccess(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    const defaultVals = resetPreferences();
    setDraft(defaultVals);
    setTheme(defaultVals.theme);
    setResetSuccess(true);
    setSaveSuccess(false);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        subtitle="View platform system configuration, customize local user preferences, and execute authoritative facility resets"
        badge={
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            System Config
          </span>
        }
        rightSlot={<ProjectResetButton variant="destructive" />}
      />

      {/* Section A — System Configuration (Read-Only) */}
      <section aria-labelledby="system-config-heading" className="space-y-4">
        <div>
          <h2 id="system-config-heading" className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" aria-hidden />
            Section A — System Configuration
          </h2>
          <p className="text-xs text-muted-foreground">Read-only platform parameters loaded from backend settings.</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex h-48 items-center justify-center p-6">
              <LoadingSpinner className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
        ) : isError || !systemSettings ? (
          <ErrorState
            title="Failed to load system settings"
            description="Unable to retrieve public configuration from the server."
            onRetry={() => void refetch()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* App Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" aria-hidden />
                  App Info
                </CardTitle>
                <CardDescription>Core application details and runtime environment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Application Name</span>
                  <span className="font-medium text-foreground">{systemSettings.app.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Version</span>
                  <Badge variant="outline">{systemSettings.app.version}</Badge>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Environment</span>
                  <Badge variant={systemSettings.app.environment === "production" ? "default" : "secondary"}>
                    {systemSettings.app.environment}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Debug Mode</span>
                  <Badge variant={systemSettings.app.debug ? "destructive" : "outline"}>
                    {systemSettings.app.debug ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* AI Models Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" aria-hidden />
                  AI Models
                </CardTitle>
                <CardDescription>Inference engine hardware and model parameters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Inference Device</span>
                  <Badge variant="default" className="uppercase">
                    {systemSettings.models.device}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Confidence Threshold</span>
                  <span className="font-medium text-foreground">
                    {(systemSettings.models.confidence_threshold * 100).toFixed(0)}% ({systemSettings.models.confidence_threshold})
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Tracking Algorithms</span>
                  <div className="flex gap-1 flex-wrap">
                    {systemSettings.models.tracking_algorithms.map((algo) => (
                      <Badge key={algo} variant="secondary">
                        {algo}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parking Config Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ParkingSquare className="h-4 w-4 text-primary" aria-hidden />
                  Parking Config
                </CardTitle>
                <CardDescription>Rules governing parking duration and violation detection.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Max Session Duration</span>
                  <span className="font-medium text-foreground">
                    {systemSettings.parking.max_session_duration_hours} hours
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Violation Threshold</span>
                  <span className="font-medium text-foreground">
                    {systemSettings.parking.violation_threshold_minutes} minutes
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Configured Camera IDs</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {systemSettings.parking.camera_ids.length > 0 ? (
                      systemSettings.parking.camera_ids.map((id) => (
                        <Badge key={id} variant="outline">
                          {id}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">None</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logging Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" aria-hidden />
                  Logging
                </CardTitle>
                <CardDescription>Server telemetry and log formatting properties.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Log Level</span>
                  <Badge variant="outline">{systemSettings.logging.level}</Badge>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Log Format</span>
                  <Badge variant="secondary" className="uppercase">
                    {systemSettings.logging.format}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Section B — User Preferences (Local state / localStorage) */}
      <section aria-labelledby="user-prefs-heading" className="space-y-4">
        <div>
          <h2 id="user-prefs-heading" className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" aria-hidden />
            Section B — User Preferences
          </h2>
          <p className="text-xs text-muted-foreground">
            Personalize your local dashboard experience. Saved automatically in browser storage.
          </p>
        </div>

        {saveSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Preferences saved successfully!
          </div>
        )}

        {resetSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Preferences reset to default values.
          </div>
        )}

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Theme Selector */}
              <div className="space-y-2">
                <label htmlFor="theme-select" className="text-sm font-medium text-foreground block">
                  Color Theme
                </label>
                <Select
                  id="theme-select"
                  aria-describedby="theme-select-desc"
                  value={draft.theme}
                  onChange={(e) => setDraft({ ...draft, theme: e.target.value as ThemePreference })}
                >
                  <option value="system">System (Default)</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </Select>
                <p id="theme-select-desc" className="text-xs text-muted-foreground">
                  Choose between Light, Dark, or sync with your system color mode.
                </p>
              </div>

              {/* Polling Interval Selector */}
              <div className="space-y-2">
                <label htmlFor="polling-select" className="text-sm font-medium text-foreground block">
                  Data Polling Interval
                </label>
                <Select
                  id="polling-select"
                  aria-describedby="polling-select-desc"
                  value={draft.pollingInterval}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      pollingInterval: Number.parseInt(e.target.value, 10) as PollingIntervalPreference,
                    })
                  }
                >
                  <option value={5000}>5 Seconds (Fast)</option>
                  <option value={10000}>10 Seconds (Standard)</option>
                  <option value={30000}>30 Seconds (Eco)</option>
                </Select>
                <p id="polling-select-desc" className="text-xs text-muted-foreground">
                  Select how frequently live parking queries auto-refresh.
                </p>
              </div>

              {/* Default Camera ID Input */}
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="default-camera-id" className="text-sm font-medium text-foreground block">
                  Default Camera ID
                </label>
                <Input
                  id="default-camera-id"
                  type="text"
                  aria-describedby="default-camera-id-desc"
                  placeholder="e.g. camera_01 (leave empty for all cameras)"
                  value={draft.defaultCameraId ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      defaultCameraId: e.target.value.trim() === "" ? null : e.target.value.trim(),
                    })
                  }
                />
                <p id="default-camera-id-desc" className="text-xs text-muted-foreground">
                  Pre-filter views to a specific camera ID upon landing on live parking features.
                </p>
              </div>

              {/* Compact Mode Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="space-y-0.5 pr-4">
                  <label htmlFor="compact-mode-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                    Compact Mode
                  </label>
                  <p id="compact-mode-desc" className="text-xs text-muted-foreground">
                    Display condensed table rows and smaller slot tiles across views.
                  </p>
                </div>
                <button
                  type="button"
                  id="compact-mode-toggle"
                  role="switch"
                  aria-checked={draft.compactMode}
                  aria-label="Toggle compact mode"
                  aria-describedby="compact-mode-desc"
                  onClick={() => setDraft({ ...draft, compactMode: !draft.compactMode })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    draft.compactMode ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                      draft.compactMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Show Notifications Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="space-y-0.5 pr-4">
                  <label
                    htmlFor="notifications-toggle"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    System Notifications
                  </label>
                  <p id="notifications-desc" className="text-xs text-muted-foreground">
                    Show inline alert banners and live websocket events.
                  </p>
                </div>
                <button
                  type="button"
                  id="notifications-toggle"
                  role="switch"
                  aria-checked={draft.showNotifications}
                  aria-label="Toggle system notifications"
                  aria-describedby="notifications-desc"
                  onClick={() => setDraft({ ...draft, showNotifications: !draft.showNotifications })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    draft.showNotifications ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                      draft.showNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                aria-label="Reset preferences to default settings"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Reset to Defaults
              </Button>
              <Button
                type="button"
                variant="default"
                aria-label="Save user preferences"
                onClick={handleSave}
                className="gap-2"
              >
                <Save className="h-4 w-4" aria-hidden />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section B.5 — Demo Simulation Engine & Shared Timeline */}
      <section aria-labelledby="demo-engine-heading" className="space-y-4">
        <div>
          <h2 id="demo-engine-heading" className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" aria-hidden />
            Section B.5 — Demo Simulation Engine &amp; Shared Timeline
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure the deterministic project movie simulation driving all 10 website pages.
          </p>
        </div>

        <Card className="border border-border/80 bg-card/60">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Project Simulation Controller</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Start, pause, or resume the 30-vehicle deterministic simulation across the canonical B2 facility.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (useDemoMovieStore.getState().status === "RUNNING") {
                      useDemoMovieStore.getState().pauseMovie();
                    } else {
                      useDemoMovieStore.getState().startMovie();
                    }
                  }}
                  className="gap-2 font-mono text-xs font-bold"
                >
                  Toggle Movie Playback
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => useDemoMovieStore.getState().resetMovie()}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Movie</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section C — Authoritative Facility Operations & Danger Zone */}
      <section aria-labelledby="danger-zone-heading" className="space-y-4">
        <div>
          <h2 id="danger-zone-heading" className="text-lg font-semibold text-destructive flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-destructive" aria-hidden />
            Section C — Authoritative Facility Operations &amp; Danger Zone
          </h2>
          <p className="text-xs text-muted-foreground">
            Authoritative reset operations that mutate persistent system state in the database and engine.
          </p>
        </div>

        <Card className="border border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center justify-between">
              <span>Authoritative Project Reset</span>
              <Badge variant="destructive" className="font-mono text-[10px]">
                DESTRUCTIVE
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Purges active vehicle sessions, frees all 10 parking slots, wipes correlate buffers, and broadcasts a global state flush via WebSocket.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Triggers backend <code className="text-destructive font-mono bg-destructive/10 px-1 py-0.5 rounded">POST /api/v1/parking/reset</code>.</p>
              <p>Use before fresh testing runs, live client demonstrations, or after completing test scenarios.</p>
            </div>
            <ProjectResetButton variant="destructive" size="default" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
