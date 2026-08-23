import type { MetadataRoute } from "next";
import { absolute } from "@/lib/site";

/** Public pages are crawlable; the API is not content. The app shell
 *  (/app) is NOT disallowed here on purpose: it carries its own
 *  `robots: noindex`, and a crawler can only honor that if it is allowed
 *  to fetch the page — disallowing it would leave the bare URL
 *  indexable from every "Open the app" link. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: absolute("/sitemap.xml"),
  };
}
