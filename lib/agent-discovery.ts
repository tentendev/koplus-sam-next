import { API_BASE, SITE_URL } from "./config";

export const CONTENT_SIGNAL =
  "ai-train=no, search=yes, ai-input=yes";

export const AGENT_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</openapi.json>; rel="service-desc"; type="application/openapi+json"',
  '</docs/api>; rel="service-doc"; type="text/markdown"',
].join(", ");

export type SeriesDoc = {
  key: string;
  name?: string;
  tagline?: string;
  updatedAt?: string;
};

type ProductDoc = {
  title?: string;
  label?: string;
  subtitle?: string;
  status?: string;
  series?: { key?: string } | string | number | null;
  panels?: Array<{ label?: string }>;
  accessories?: Array<{ label?: string }>;
};

type PaginatedResponse<T> = {
  docs?: T[];
};

async function fetchCmsDocs<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as PaginatedResponse<T>;
    return Array.isArray(payload.docs) ? payload.docs : [];
  } catch {
    return [];
  }
}

export function getSeriesDocs(): Promise<SeriesDoc[]> {
  return fetchCmsDocs<SeriesDoc>(
    "/api/series?depth=0&limit=100&sort=sortOrder",
  );
}

function getProductDocs(): Promise<ProductDoc[]> {
  return fetchCmsDocs<ProductDoc>(
    "/api/products?depth=2&limit=100&sort=sortOrder",
  );
}

function markdownInline(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([[\]_*`])/g, "\\$1")
    .replace(/\s+/g, " ")
    .trim();
}

function resourceLinks(): string {
  return [
    "## Agent resources",
    "",
    `- [API catalog](${SITE_URL}/.well-known/api-catalog)`,
    `- [OpenAPI description](${SITE_URL}/openapi.json)`,
    `- [Service documentation](${SITE_URL}/docs/api)`,
    `- [Sitemap](${SITE_URL}/sitemap.xml)`,
  ].join("\n");
}

export async function renderMarkdownPage(pathname: string): Promise<{
  body: string;
  status: number;
}> {
  const [seriesDocs, productDocs] = await Promise.all([
    getSeriesDocs(),
    getProductDocs(),
  ]);

  if (pathname === "/") {
    const availableSeries =
      seriesDocs.length > 0
        ? seriesDocs
        : [{ key: "sam", name: "SAM" }];
    const links = availableSeries.map((series) => {
      const name = markdownInline(series.name || series.key.toUpperCase());
      return `- [${name}](${SITE_URL}/${encodeURIComponent(series.key)})`;
    });

    return {
      status: 200,
      body: [
        "# Koplus Booth Configurator",
        "",
        "Configure Koplus acoustic booths by product line, model, panel, finish, and accessory.",
        "",
        "## Available product lines",
        "",
        ...links,
        "",
        resourceLinks(),
        "",
      ].join("\n"),
    };
  }

  const key = decodeURIComponent(pathname.slice(1)).toLowerCase();
  const series = seriesDocs.find((item) => item.key.toLowerCase() === key);

  if (!series) {
    return {
      status: 404,
      body: [
        "# Product line not found",
        "",
        `No published Koplus product line exists at \`${pathname}\`.`,
        "",
      ].join("\n"),
    };
  }

  const products = productDocs.filter((product) => {
    if (product.status && product.status !== "published") return false;
    if (typeof product.series === "object" && product.series) {
      return product.series.key?.toLowerCase() === key;
    }
    return false;
  });

  const productSections = products.flatMap((product) => {
    const title = markdownInline(
      product.title || product.label || "Koplus booth",
    );
    const panels = product.panels
      ?.map((panel) => panel.label)
      .filter((label): label is string => Boolean(label));
    const accessories = product.accessories
      ?.map((accessory) => accessory.label)
      .filter((label): label is string => Boolean(label));

    return [
      `### ${title}`,
      "",
      ...(product.subtitle ? [markdownInline(product.subtitle), ""] : []),
      `- Model: ${markdownInline(product.label || title)}`,
      `- Panel choices: ${
        panels?.length ? panels.map(markdownInline).join(", ") : "See configurator"
      }`,
      `- Accessories: ${
        accessories?.length
          ? accessories.map(markdownInline).join(", ")
          : "None listed"
      }`,
      "",
    ];
  });

  const seriesName = markdownInline(series.name || series.key.toUpperCase());
  return {
    status: 200,
    body: [
      `# Koplus ${seriesName} Booth Configurator`,
      "",
      `Canonical URL: ${SITE_URL}/${encodeURIComponent(series.key)}`,
      "",
      ...(series.tagline ? [markdownInline(series.tagline), ""] : []),
      "Use the HTML configurator to select a model, panels, colours, and accessories, then submit a quote request.",
      "",
      "## Available models",
      "",
      ...(productSections.length
        ? productSections
        : ["Model details are available in the HTML configurator.", ""]),
      `[Open the interactive configurator](${SITE_URL}/${encodeURIComponent(series.key)})`,
      "",
      resourceLinks(),
      "",
    ].join("\n"),
  };
}
