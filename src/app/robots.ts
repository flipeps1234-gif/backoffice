import type { MetadataRoute } from "next";

/** Public pages are crawlable; the app shell and API are not content. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api/"],
    },
    sitemap: "https://backoffice-nine-blond.vercel.app/sitemap.xml",
  };
}
