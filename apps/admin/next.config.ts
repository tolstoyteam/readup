import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/books/works/*/cover-design/**": [
      "./lib/NotoSans.ttf",
      "./lib/NotoSerif-Regular.woff",
      "./lib/NotoSerif-Bold.woff",
    ],
  },
};

export default nextConfig;
