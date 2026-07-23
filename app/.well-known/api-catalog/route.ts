import {
  AGENT_LINK_HEADER,
  CONTENT_SIGNAL,
} from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/config";

const PROFILE = "https://www.rfc-editor.org/info/rfc9727";

function headers(): HeadersInit {
  return {
    "Cache-Control": "public, max-age=3600",
    "Content-Signal": CONTENT_SIGNAL,
    "Content-Type": `application/linkset+json; profile="${PROFILE}"`,
    Link: AGENT_LINK_HEADER,
  };
}

export function GET() {
  return new Response(
    JSON.stringify(
      {
        linkset: [
          {
            anchor: SITE_URL,
            item: [
              {
                href: `${SITE_URL}/`,
                type: "text/html",
                title: "Koplus Booth Configurator",
              },
            ],
            "service-desc": [
              {
                href: `${SITE_URL}/openapi.json`,
                type: "application/openapi+json",
              },
            ],
            "service-doc": [
              {
                href: `${SITE_URL}/docs/api`,
                type: "text/markdown",
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
    { headers: headers() },
  );
}

export function HEAD() {
  return new Response(null, { headers: headers() });
}
