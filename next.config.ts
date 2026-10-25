import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Leaves room for 4 MB photos plus multipart overhead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
