/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/speech/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/speech/:path*`,
      },
    ];
  },
  // Enable React Strict Mode
  reactStrictMode: true,
  // Configure images if needed
  images: {
    domains: ['*'],
  },
  // Output directory for the build
  distDir: '.next',
  // Enable static HTML export
  output: 'standalone',
  // Enable server components

};

module.exports = nextConfig;
