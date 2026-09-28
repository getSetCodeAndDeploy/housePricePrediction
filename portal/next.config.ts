import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // small self-contained Docker image
};

export default nextConfig;
