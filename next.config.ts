import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Using direct API calls in route handlers instead of rewrites
  // to have better control over request/response handling
};

export default nextConfig;
