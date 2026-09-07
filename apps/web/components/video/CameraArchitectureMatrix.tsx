"use client";

import React, { useState } from "react";
import { Video, Play, MapPin, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { CANONICAL_16_CAMERAS, type DemoCamera } from "@/components/digital-twin/demoScenarioData";

export function CameraArchitectureMatrix() {
  const [activeVideoCam, setActiveVideoCam] = useState<DemoCamera | null>(null);

  const onlineCount = CANONICAL_16_CAMERAS.filter((c) => c.status === "ONLINE").length;
  const standbyCount = CANONICAL_16_CAMERAS.length - onlineCount;

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5">
            <Video className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-bold">16-Camera Facility Surveillance Architecture</CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20">
              4×4 Grid Matrix
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Authoritative hardware camera topology from user floor plan reference. Verified coordinates on 1472×1508 canvas.
          </CardDescription>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <StatusDot status="online" pulse />
            <span className="text-emerald-400 font-semibold">{onlineCount} Online</span>
          </div>
          <span className="text-muted-foreground">·</span>
          <div className="flex items-center gap-1.5">
            <StatusDot status="offline" />
            <span className="text-muted-foreground font-semibold">{standbyCount} Standby</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {CANONICAL_16_CAMERAS.map((cam) => {
            const isEntry = cam.role === "ENTRY";
            const isExit = cam.role === "EXIT";
            const hasVideo = !!cam.videoUrl;

            return (
              <div
                key={cam.id}
                className={`group relative rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                  hasVideo
                    ? "border-primary/40 bg-card hover:border-primary shadow-sm"
                    : "border-border/40 bg-muted/20 opacity-80 hover:opacity-100"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {cam.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {hasVideo ? (
                        <SourceBadge source="mp4" />
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono uppercase text-muted-foreground border-border/50">
                          {isExit ? "RESERVED EXIT" : "STANDBY"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-foreground truncate mb-1">
                    {cam.label}
                  </p>

                  <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground mb-3">
                    <MapPin className="h-3 w-3 text-sky-400" />
                    <span>({cam.x}, {cam.y}) · {cam.locationName}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[10px] uppercase">
                    Role:{" "}
                    <span
                      className={
                        isEntry
                          ? "text-emerald-400 font-bold"
                          : isExit
                          ? "text-amber-400 font-bold"
                          : "text-primary font-bold"
                      }
                    >
                      {cam.role}
                    </span>
                  </span>

                  {hasVideo ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => setActiveVideoCam(cam)}
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                      <span>Open Video</span>
                    </Button>
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      NO VIDEO SOURCE
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* ── Video Player Modal ── */}
      {activeVideoCam && activeVideoCam.videoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50"
          onClick={() => setActiveVideoCam(null)}
        >
          <Card
            className="w-full max-w-2xl border-border bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-foreground">
                  {activeVideoCam.id} · {activeVideoCam.label}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ⏺ DEMO · REPLAY
                </span>
              </div>
              <button
                onClick={() => setActiveVideoCam(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-border/40">
                <video
                  src={activeVideoCam.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Location: {activeVideoCam.locationName}</span>
                <span>Canvas Coords: ({activeVideoCam.x}, {activeVideoCam.y})</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
