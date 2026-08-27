import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Backend (FastAPI) runs on :8000; allow it as an image/asset remote if needed later.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
