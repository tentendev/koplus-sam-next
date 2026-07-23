import { CONTENT_SIGNAL } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/config";

export function GET() {
  return Response.json(
    {
      version: "1.0",
      organization: {
        name: "Koplus",
        url: "https://koplus.com",
      },
      services: [
        {
          id: "booth-configurator",
          name: "Koplus Booth Configurator",
          endpoint: SITE_URL,
          apiCatalog: `${SITE_URL}/.well-known/api-catalog`,
          serviceDescription: `${SITE_URL}/openapi.json`,
          serviceDocumentation: `${SITE_URL}/docs/api`,
          sitemap: `${SITE_URL}/sitemap.xml`,
          representations: ["text/html", "text/markdown"],
          contentSignal: CONTENT_SIGNAL,
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Signal": CONTENT_SIGNAL,
      },
    },
  );
}
