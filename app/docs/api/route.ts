import { CONTENT_SIGNAL } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/config";

export function GET() {
  const body = [
    "# Koplus Booth Configurator — Agent Service Documentation",
    "",
    "The configurator is a public, read-only product discovery surface. Browsers receive HTML; agents can request Markdown from the homepage or a product-line route.",
    "",
    "## Content negotiation",
    "",
    "Send `Accept: text/markdown` to `/` or `/{series}`. A successful response uses `Content-Type: text/markdown; charset=utf-8`, includes `Vary: Accept`, and reports an approximate `x-markdown-tokens` count.",
    "",
    "## Discovery resources",
    "",
    `- API catalog: ${SITE_URL}/.well-known/api-catalog`,
    `- OpenAPI: ${SITE_URL}/openapi.json`,
    `- Agent index: ${SITE_URL}/.well-known/agent-index.json`,
    `- Robots rules: ${SITE_URL}/robots.txt`,
    `- Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
    "## Usage policy",
    "",
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "",
    "Public pages may be used for search and as input to agent responses, but not for model training.",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": CONTENT_SIGNAL,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
