import { CONTENT_SIGNAL } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/config";

export function GET() {
  return Response.json(
    {
      openapi: "3.1.0",
      info: {
        title: "Koplus Booth Configurator Discovery API",
        version: "1.0.0",
        description:
          "Public discovery endpoints and content-negotiated product-line pages for the Koplus Booth Configurator.",
      },
      servers: [{ url: SITE_URL }],
      paths: {
        "/": {
          get: {
            summary: "Discover available Koplus product lines",
            parameters: [
              {
                name: "Accept",
                in: "header",
                schema: { type: "string", enum: ["text/html", "text/markdown"] },
              },
            ],
            responses: {
              "200": {
                description: "Markdown product-line index when requested",
                content: { "text/markdown": {} },
              },
              "307": { description: "Browser redirect to the default product line" },
            },
          },
        },
        "/{series}": {
          get: {
            summary: "Get a product-line configurator",
            parameters: [
              {
                name: "series",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
              {
                name: "Accept",
                in: "header",
                schema: { type: "string", enum: ["text/html", "text/markdown"] },
              },
            ],
            responses: {
              "200": {
                description: "HTML configurator or Markdown representation",
                content: {
                  "text/html": {},
                  "text/markdown": {},
                },
              },
              "404": { description: "Unknown product line" },
            },
          },
        },
        "/robots.txt": {
          get: {
            summary: "Get crawler and AI content-usage rules",
            responses: { "200": { description: "Robots Exclusion Protocol file" } },
          },
        },
        "/sitemap.xml": {
          get: {
            summary: "Get canonical product-line URLs",
            responses: { "200": { description: "XML sitemap" } },
          },
        },
        "/.well-known/api-catalog": {
          get: {
            summary: "Get the RFC 9727 API catalog",
            responses: { "200": { description: "Linkset JSON API catalog" } },
          },
          head: {
            summary: "Discover the API catalog through response headers",
            responses: { "200": { description: "API catalog Link header" } },
          },
        },
        "/.well-known/agent-index.json": {
          get: {
            summary: "Get the DNS-AID organization index",
            responses: { "200": { description: "Agent discovery index" } },
          },
        },
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Signal": CONTENT_SIGNAL,
      },
    },
  );
}
