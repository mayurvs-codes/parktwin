"use client";

import React from "react";
import { Server, Database, Cpu, Radio, Video } from "lucide-react";
import { useHealth } from "@/hooks/useDashboard";
import { StatusDot } from "@/components/ui/StatusDot";

export function SystemStatusRow() {
  const { data: health, isLoading } = useHealth();

  const isBackendOk = health?.integration === "ok" || health?.status === "ok";
  const isEngineReady = health?.parking_engine_initialized ?? false;
  const isWsConnected = !isLoading;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
          System Core:
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
        {/* Backend */}
        <div className="flex items-center gap-2">
          <Server className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">API Gateway</span>
          <div className="flex items-center gap-1.5 font-mono">
            <StatusDot status={isBackendOk ? "online" : "offline"} pulse={isBackendOk} />
            <span className={isBackendOk ? "text-emerald-400 font-medium" : "text-destructive font-medium"}>
              {isBackendOk ? "OPERATIONAL" : "DEGRADED"}
            </span>
          </div>
        </div>

        {/* Database */}
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Database</span>
          <div className="flex items-center gap-1.5 font-mono">
            <StatusDot status="online" />
            <span className="text-foreground font-medium">SQLite (parktwin.db)</span>
          </div>
        </div>

        {/* CV / Engine */}
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">CV Engine</span>
          <div className="flex items-center gap-1.5 font-mono">
            <StatusDot status={isEngineReady ? "online" : "unknown"} />
            <span className={isEngineReady ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
              {isEngineReady ? "READY" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* WebSocket */}
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">WebSocket</span>
          <div className="flex items-center gap-1.5 font-mono">
            <StatusDot status={isWsConnected ? "online" : "offline"} pulse={isWsConnected} />
            <span className={isWsConnected ? "text-emerald-400 font-medium" : "text-muted-foreground font-medium"}>
              {isWsConnected ? "STREAMING" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Cameras */}
        <div className="flex items-center gap-2">
          <Video className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">CCTV Matrix</span>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-primary font-semibold">3 Active</span>
            <span className="text-muted-foreground">/ 16 Arch</span>
          </div>
        </div>
      </div>
    </div>
  );
}
