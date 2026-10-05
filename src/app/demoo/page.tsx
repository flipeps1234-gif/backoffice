import type { Metadata } from "next";
import DemoApp from "./demo-app";

/**
 * A clickable preview of the proposed PHONE app (look B on the "Contado
 * Mobile Redesign" canvas: a slim black banner, the desktop home's number
 * and month chart, and the desktop sidebar as a slide-in menu). Sample
 * numbers only — nothing here reads an account or saves anything.
 * Unlisted: noindex, and not in lib/site.ts PUBLIC_PAGES, so the sitemap
 * never names it. Not /demooo (three o's): that one is the real desktop
 * app.
 */
export const metadata: Metadata = {
  title: "Mobile app demo",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoApp />;
}
