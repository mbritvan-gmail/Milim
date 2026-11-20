import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The Alef-bet sound clips rarely change: let the phone keep them for a day so replays are instant.
  async headers() {
    return [{ source: "/audio/alef-bet/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] }];
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
