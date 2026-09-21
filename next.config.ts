import type { NextConfig } from "next";
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  images: { formats: ["image/avif", "image/webp"] },
  poweredByHeader: false,
  devIndicators: false,
};
export default config;
