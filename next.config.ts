import type { NextConfig } from "next";
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  images: { formats: ["image/avif", "image/webp"] },
  poweredByHeader: false,
  devIndicators: false,
  // The try-on route reads each look's full-silhouette photo from disk; make sure those files ship with the function.
  outputFileTracingIncludes: { "/api/fit/try-on": ["./public/media/*-1600.jpg"] },
};
export default config;
