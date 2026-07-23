import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  AGENT_LINK_HEADER,
  CONTENT_SIGNAL,
  renderMarkdownPage,
} from "@/lib/agent-discovery";

function acceptsMarkdown(accept: string | null): boolean {
  if (!accept) return false;

  return accept.split(",").some((part) => {
    const [mediaType, ...parameters] = part.trim().split(";");
    if (mediaType.toLowerCase() !== "text/markdown") return false;

    const quality = parameters
      .map((parameter) => parameter.trim().toLowerCase())
      .find((parameter) => parameter.startsWith("q="));
    return quality ? Number.parseFloat(quality.slice(2)) > 0 : true;
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPagePath =
    pathname === "/" || /^\/[a-z0-9-]+$/i.test(pathname);

  if (
    !isPagePath ||
    !["GET", "HEAD"].includes(request.method) ||
    !acceptsMarkdown(request.headers.get("accept"))
  ) {
    const response = NextResponse.next();
    if (isPagePath) {
      response.headers.set("Content-Signal", CONTENT_SIGNAL);
      response.headers.set("Link", AGENT_LINK_HEADER);
      response.headers.set("Vary", "Accept");
    }
    return response;
  }

  const result = await renderMarkdownPage(pathname);
  const tokenEstimate = Math.max(1, Math.ceil(result.body.length / 4));

  return new Response(request.method === "HEAD" ? null : result.body, {
    status: result.status,
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Signal": CONTENT_SIGNAL,
      "Content-Type": "text/markdown; charset=utf-8",
      Link: AGENT_LINK_HEADER,
      Vary: "Accept",
      "x-markdown-tokens": String(tokenEstimate),
    },
  });
}

export const config = {
  matcher: ["/", "/:series"],
};
