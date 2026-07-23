import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { API_BASE } from "@/lib/config";
import Configurator from "@/components/Configurator";

// Always validate against live CMS data — adding a line in the CMS makes its
// route work immediately, and unknown lines 404.
export const dynamic = "force-dynamic";

type SeriesDoc = { key: string; name?: string; tagline?: string };

async function getSeries(key: string): Promise<SeriesDoc | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/series?where[key][equals]=${encodeURIComponent(key)}&depth=0&limit=1`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.docs?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ series: string }>;
}): Promise<Metadata> {
  const { series } = await params;
  const doc = await getSeries(series.toLowerCase());
  return {
    title: `Koplus - ${doc?.name ?? "Booth"} Booth Configurator`,
    alternates: { canonical: `/${series.toLowerCase()}` },
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ series: string }>;
}) {
  const { series } = await params;
  const key = series.toLowerCase();
  const doc = await getSeries(key);
  if (!doc) notFound();
  return <Configurator series={key} apiBase={API_BASE} />;
}
