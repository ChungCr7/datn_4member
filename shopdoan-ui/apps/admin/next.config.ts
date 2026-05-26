import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// Force port for admin app
process.env.PORT = process.env.PORT || '3004';

export default nextConfig;
