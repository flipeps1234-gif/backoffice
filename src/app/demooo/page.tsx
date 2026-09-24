import type { Metadata } from "next";
import DemoApp from "./demo-app";

/**
 * A clickable preview of the proposed desktop app (design E on the
 * "Contado Desktop Redesign" canvas: the Night desk layout in the Black
 * rail colours). Sample numbers only — nothing here reads an account.
 * Unlisted: noindex, and not in lib/site.ts PUBLIC_PAGES, so the sitemap
 * never names it.
 */
export const metadata: Metadata = {
  title: "Desktop app demo",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoApp />;
}
