import type { NextConfig } from "next";
import { CONTENT_SIGNAL } from "./lib/agent-discovery";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Signal", value: CONTENT_SIGNAL }],
      },
    ];
  },
};

export default nextConfig;
