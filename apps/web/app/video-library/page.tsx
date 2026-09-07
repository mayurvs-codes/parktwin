import type { Metadata } from "next";
import { VideoLibraryView } from "@/components/video-library/VideoLibraryView";

export const metadata: Metadata = {
  title: "Video Library | ParkTwin AI",
  description: "Browse CCTV footage, designate camera roles, and run real video-driven parking intelligence.",
};

export default function VideoLibraryPage() {
  return <VideoLibraryView />;
}
