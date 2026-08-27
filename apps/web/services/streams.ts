import { apiClient, apiGet, apiPost } from "./api-client";

export interface StreamInfoDTO {
  camera_id: string;
  source_url: string;
  fps: number;
  frame_count: number;
  status: "connected" | "disconnected";
}

export interface StartStreamResponseDTO {
  camera_id: string;
  status: string;
  source_url: string;
}

export interface StopStreamResponseDTO {
  camera_id: string;
  status: string;
}

/** Start a live camera stream (RTSP URL or USB index '0'). */
export async function startStream(
  cameraId: string,
  sourceUrl: string
): Promise<StartStreamResponseDTO> {
  return apiPost<StartStreamResponseDTO>("/streams/start", {
    camera_id: cameraId,
    source_url: sourceUrl,
  });
}

/** Stop an active camera stream. */
export async function stopStream(cameraId: string): Promise<StopStreamResponseDTO> {
  return apiPost<StopStreamResponseDTO>(`/streams/stop?camera_id=${encodeURIComponent(cameraId)}`);
}

/** Fetch all active camera stream statuses. */
export async function fetchStreams(): Promise<StreamInfoDTO[]> {
  return apiGet<StreamInfoDTO[]>("/streams");
}

/** Fetch the latest JPEG frame for a camera stream as a Blob. */
export async function fetchFrame(cameraId: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/streams/${encodeURIComponent(cameraId)}/frame`, {
    responseType: "blob",
  });
  return response.data;
}
