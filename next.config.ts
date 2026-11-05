import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // allow opening the dev server from LAN / Tailscale addresses
  allowedDevOrigins: ["192.168.100.11", "100.71.189.109", "*.local"],
  serverExternalPackages: ["pg", "sharp"],
  experimental: {
    serverActions: { bodySizeLimit: "16mb" }, // admin photo uploads
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
