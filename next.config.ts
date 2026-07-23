import type { NextConfig } from "next";
import {
  AGENT_LINK_HEADER,
  CONTENT_SIGNAL,
} from "./lib/agent-discovery";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Signal", value: CONTENT_SIGNAL }],
      },
      {
        source: "/",
        headers: [
          { key: "Link", value: AGENT_LINK_HEADER },
          { key: "Vary", value: "Accept" },
        ],
      },
      {
        source: "/:series",
        headers: [{ key: "Vary", value: "Accept" }],
      },
    ];
  },
};

export default nextConfig;
