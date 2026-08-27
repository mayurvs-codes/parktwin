"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Check, Loader2, Pencil, Play, Square, Video } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VideoUpload, type VideoUploadSnapshot } from "@/components/processing/VideoUpload";
import type { ProcessVideoResult } from "@/services/processing";
import { AiPipeline } from "./AiPipeline";
import { ProcessingSummary } from "./ProcessingSummary";
import { CAMERA_STATUS_META, READY_LABEL } from "./cameraStatus";
import {
  type CameraConfig,
  type CameraSource,
} from "./cameraTypes";
import { useStreamFrame } from "@/hooks/useStreamFrame";
import { startStream, stopStream } from "@/services/streams";

export interface CameraPanelHandle {
  triggerProcess: () => Promise<void>;
}

export interface CameraPanelProps {
  camera: CameraConfig;
  snapshot: VideoUploadSnapshot;
  onRename: (id: string, name: string) => void;
  onSnapshotChange: (id: string, snapshot: VideoUploadSnapshot) => void;
  onSourceChange?: (id: string, source: CameraSource) => void;
}

export const CameraPanel = forwardRef<CameraPanelHandle, CameraPanelProps>(function CameraPanel(
  {
    camera,
    snapshot,
    onRename,
    onSnapshotChange,
    onSourceChange,
  },
  ref
) {
  const uploadTriggerRef = useRef<(() => Promise<ProcessVideoResult | undefined>) | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      triggerProcess: async () => {
        if (uploadTriggerRef.current) {
          await uploadTriggerRef.current();
        }
      },
    }),
    []
  );

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(camera.name);
  const [source, setSource] = useState<CameraSource>(camera.source || "upload");
  const [rtspUrl, setRtspUrl] = useState("rtsp://192.168.1.100:554/stream");

  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const { frameUrl, fps, error: frameError } = useStreamFrame(camera.id, isStreaming);

  const handleState = useCallback(
    (snap: VideoUploadSnapshot) => onSnapshotChange(camera.id, snap),
    [camera.id, onSnapshotChange]
  );

  const handleStartStream = async (url: string) => {
    setIsStarting(true);
    setStreamError(null);
    try {
      await startStream(camera.id, url);
      setIsStreaming(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start stream";
      setStreamError(msg);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopStream = async () => {
    try {
      await stopStream(camera.id);
    } catch {
      // Ignore stop errors
    } finally {
      setIsStreaming(false);
    }
  };

  const meta = CAMERA_STATUS_META[isStreaming ? "processing" : snapshot.status];
  const Icon = meta.icon;
  const statusLabel = isStreaming
    ? "Live Streaming"
    : snapshot.status === "waiting" && snapshot.file
    ? READY_LABEL
    : meta.label;

  const commitName = () => {
    const next = draftName.trim() || camera.name;
    onRename(camera.id, next);
    setDraftName(next);
    setIsEditing(false);
  };

  const onSelectSource = (newSource: CameraSource) => {
    setSource(newSource);
    if (isStreaming) {
      handleStopStream();
    }
    if (onSourceChange) {
      onSourceChange(camera.id, newSource);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Video className="h-5 w-5" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitName();
                    if (e.key === "Escape") {
                      setDraftName(camera.name);
                      setIsEditing(false);
                    }
                  }}
                  aria-label="Camera name"
                  className="h-8"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Save camera name"
                  onClick={commitName}
                >
                  <Check className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
                  {camera.name}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Edit camera name"
                  onClick={() => {
                    setDraftName(camera.name);
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            )}
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{camera.id}</p>
          </div>

          <Badge variant={meta.badge} className="shrink-0">
            <Icon className="h-3 w-3" aria-hidden />
            {statusLabel}
          </Badge>
        </div>

        <div className="w-48">
          <Select
            value={source}
            onChange={(e) => onSelectSource(e.target.value as CameraSource)}
            aria-label="Camera Source"
          >
            <option value="upload">Uploaded Video</option>
            <option value="rtsp">RTSP Camera Feed</option>
            <option value="usb">USB Camera (Index 0)</option>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {source === "upload" && (
          <VideoUpload
            cameraId={camera.id}
            onStateChange={handleState}
            onTriggerRef={uploadTriggerRef}
          />
        )}

        {source === "rtsp" && (
          <div className="space-y-3">
            {!isStreaming ? (
              <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                <label className="text-xs font-medium text-foreground">RTSP Stream URL</label>
                <div className="flex gap-2">
                  <Input
                    value={rtspUrl}
                    onChange={(e) => setRtspUrl(e.target.value)}
                    placeholder="rtsp://192.168.1.100:554/stream"
                    className="h-9 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleStartStream(rtspUrl)}
                    disabled={isStarting || !rtspUrl.trim()}
                  >
                    {isStarting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start
                  </Button>
                </div>
                {(streamError || frameError) && (
                  <p className="text-xs text-destructive">{streamError || frameError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-black">
                  {frameUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={frameUrl}
                      alt={`${camera.name} live feed`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Acquiring stream frame...
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex items-center gap-2">
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {fps} FPS
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleStopStream} className="w-full">
                  <Square className="h-4 w-4" /> Stop RTSP Stream
                </Button>
              </div>
            )}
          </div>
        )}

        {source === "usb" && (
          <div className="space-y-3">
            {!isStreaming ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Connect to local USB webcam hardware (Device Index 0).
                </p>
                <Button
                  size="sm"
                  onClick={() => handleStartStream("0")}
                  disabled={isStarting}
                >
                  {isStarting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Connect USB Webcam
                </Button>
                {(streamError || frameError) && (
                  <p className="text-xs text-destructive">{streamError || frameError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-black">
                  {frameUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={frameUrl}
                      alt={`${camera.name} USB feed`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Acquiring USB video frame...
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex items-center gap-2">
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE USB
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {fps} FPS
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleStopStream} className="w-full">
                  <Square className="h-4 w-4" /> Disconnect USB Camera
                </Button>
              </div>
            )}
          </div>
        )}

        <section aria-labelledby={`pipeline-${camera.id}`} className="border-t border-border pt-4">
          <h4
            id={`pipeline-${camera.id}`}
            className="mb-3 text-sm font-semibold tracking-tight text-foreground"
          >
            AI Processing Pipeline
          </h4>
          <AiPipeline status={isStreaming ? "processing" : snapshot.status} />
        </section>

        <section aria-labelledby={`summary-${camera.id}`} className="border-t border-border pt-4">
          <h4
            id={`summary-${camera.id}`}
            className="mb-3 text-sm font-semibold tracking-tight text-foreground"
          >
            Processing Summary
          </h4>
          <ProcessingSummary snapshot={snapshot} />
        </section>
      </CardContent>
    </Card>
  );
});
