/** @type {import('next').NextConfig} */
const apiUrl = process.env.API_URL || "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiUrl}/:path*` },
    ];
  },
};

module.exports = nextConfig;
