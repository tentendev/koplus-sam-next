import { CONTENT_SIGNAL } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/config";

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "Claude-Web",
  "Google-Extended",
  "Amazonbot",
  "anthropic-ai",
  "Bytespider",
  "CCBot",
  "Applebot-Extended",
];

function rulesFor(userAgents: string[]): string[] {
  return [
    ...userAgents.map((userAgent) => `User-agent: ${userAgent}`),
    "Allow: /",
    "Disallow: /api/",
    `Content-Signal: ${CONTENT_SIGNAL}`,
  ];
}

export function GET() {
  const body = [
    ...rulesFor(["*"]),
    "",
    ...rulesFor(AI_CRAWLERS),
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
