import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set EXAMPLE_BASE to host the demo under a sub-path (e.g. GitHub Pages).
  basePath: process.env.EXAMPLE_BASE || undefined,
};

export default nextConfig;
