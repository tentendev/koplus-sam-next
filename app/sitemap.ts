import type { MetadataRoute } from "next";
import { getSeriesDocs } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seriesDocs = await getSeriesDocs();
  const canonicalSeries =
    seriesDocs.length > 0
      ? seriesDocs
      : [{ key: "sam", updatedAt: undefined }];

  return canonicalSeries.map((series) => ({
    url: `${SITE_URL}/${encodeURIComponent(series.key)}`,
    ...(series.updatedAt ? { lastModified: series.updatedAt } : {}),
    changeFrequency: "weekly",
    priority: 1,
  }));
}
