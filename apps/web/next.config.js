/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for GitHub Pages and Electron deployment
  // Note: This disables features like API routes and server-side rendering
  // All pages must be pre-rendered at build time
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
