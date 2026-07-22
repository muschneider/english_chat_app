import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Neon serverless driver runs on the edge/node runtime without extra bundling.
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
