import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Cog,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import type { BadgeProps } from "@/components/ui/badge";
import type { VideoUploadStatus } from "@/components/processing/VideoUpload";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Presentation metadata for each video-processing lifecycle status.
 *
 * Single source of truth for the status badge shown on every camera panel and
 * (potentially) elsewhere. Moved here from the old `ProcessingStatusCard` so
 * the CCTV Control Center has one canonical status→label/icon/variant map.
 */
export const CAMERA_STATUS_META: Record<
  VideoUploadStatus,
  { label: string; icon: LucideIcon; badge: BadgeVariant }
> = {
  waiting: { label: "Idle", icon: CircleDashed, badge: "secondary" },
  uploading: { label: "Uploading", icon: UploadCloud, badge: "default" },
  processing: { label: "Processing", icon: Cog, badge: "default" },
  completed: { label: "Completed", icon: CheckCircle2, badge: "success" },
  failed: { label: "Failed", icon: AlertCircle, badge: "destructive" },
};

/** Human label for the "waiting" state when a video is already selected. */
export const READY_LABEL = "Ready";
