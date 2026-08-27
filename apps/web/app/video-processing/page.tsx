import type { Metadata } from "next";
import { VideoProcessingView } from "@/components/video/VideoProcessingView";

export const metadata: Metadata = {
  title: "CCTV Control Center",
  description: "Manage and process multiple parking camera videos.",
};

/**
 * CCTV Control Center (Module 6 — Phase 4).
 *
 * Dedicated multi-camera video-processing workspace. Renders the control panel
 * + camera grid via the shared `VideoProcessingView`. Reuses the existing
 * `VideoUpload` widget and `services/processing` transport — no new upload
 * implementation, no backend changes.
 */
export default function VideoProcessingPage() {
  return <VideoProcessingView />;
}
