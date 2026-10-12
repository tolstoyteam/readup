import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/books/works/*/cover-design/**": ["./lib/NotoSans.ttf"],
  },
};

export default nextConfig;
