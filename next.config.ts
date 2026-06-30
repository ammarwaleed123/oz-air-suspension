import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Allow remote build/product images; tighten to your storage host later.
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      // Image uploads run through Server Actions; the default body limit is 1 MB,
      // which silently fails for normal phone photos. Allow up to 8 MB (storage
      // itself caps individual images at 6 MB — see src/lib/storage.ts).
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
