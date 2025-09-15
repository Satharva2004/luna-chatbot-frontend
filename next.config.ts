import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://assignment-backend-one-khaki.vercel.app/api/gemini/:path*',
      },
    ]
  },
};

export default nextConfig;
