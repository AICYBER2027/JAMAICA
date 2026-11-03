import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hotel JSON files are read at runtime; make sure they ship with the server build.
  outputFileTracingIncludes: { "/**": ["./data/hotels/**/*"] },
};

export default nextConfig;
