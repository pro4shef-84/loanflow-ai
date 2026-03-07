import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["twilio"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
