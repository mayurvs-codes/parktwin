import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Backend (FastAPI) runs on :8000; allow it as an image/asset remote if needed later.
  images: {
    remotePatterns: [],
  },
  // Proxy /videos/* → FastAPI StaticFiles mount so archive MP4s (served from
  // the backend's `videos/` bind-mount) are reachable from the frontend without
  // duplicating 14 GB into the Next.js container or public/ directory.
  //
  // Uses NEXT_INTERNAL_API_BASE for container-internal routing (http://backend:8000),
  // falling back to NEXT_PUBLIC_API_BASE or localhost for local dev outside Docker.
  async rewrites() {
    const apiBase =
      process.env.NEXT_INTERNAL_API_BASE ??
      process.env.NEXT_PUBLIC_API_BASE ??
      "http://localhost:8000";
    return [
      {
        source: "/videos/:path*",
        destination: `${apiBase}/videos/:path*`,
      },
    ];
  },
};

export default nextConfig;
