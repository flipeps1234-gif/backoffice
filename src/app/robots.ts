import type { MetadataRoute } from "next";
import { absolute } from "@/lib/site";

/** Public pages are crawlable; the app shell and API are not content. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api/"],
    },
    sitemap: absolute("/sitemap.xml"),
  };
}
