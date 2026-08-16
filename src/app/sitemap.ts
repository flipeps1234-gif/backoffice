import type { MetadataRoute } from "next";
import { HELP_SLUGS } from "@/lib/help";

/** Every public page. The app itself (/app) is deliberately absent —
 *  it's a sign-in gate, not content, and robots.ts disallows it. */
const BASE = "https://backoffice-nine-blond.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/help`, changeFrequency: "weekly", priority: 0.8 },
    ...HELP_SLUGS.map((slug) => ({
      url: `${BASE}/help/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${BASE}/privacy`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/terms`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
