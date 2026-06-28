import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Allow remote build/product images; tighten to your storage host later.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
