import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/config";

export const dynamic = "force-dynamic";

// Send the bare domain to the first (lowest sortOrder) product line.
export default async function Home() {
  let target = "sam";
  try {
    const res = await fetch(
      `${API_BASE}/api/series?depth=0&limit=1&sort=sortOrder`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const json = await res.json();
      if (json.docs?.[0]?.key) target = json.docs[0].key;
    }
  } catch {
    // fall back to "sam"
  }
  redirect(`/${target}`);
}
