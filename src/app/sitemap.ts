import type { MetadataRoute } from "next";
import { HELP_SLUGS } from "@/lib/help";
import { PUBLIC_PAGES, absolute } from "@/lib/site";

/** Every public page, from the one list in lib/site.ts plus each help
 *  article. The app (/app) is deliberately absent — it's a sign-in gate,
 *  not content, and robots.ts disallows it. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PUBLIC_PAGES.map((page) => ({
      url: absolute(page.path),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...HELP_SLUGS.map((slug) => ({
      url: absolute(`/help/${slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
