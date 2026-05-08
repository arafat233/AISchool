/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: "/api/auth/:path*" },
      { source: "/api/:path*", destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/:path*` },
    ];
  },
};

export default nextConfig;
