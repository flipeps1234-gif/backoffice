import type { Metadata } from "next";
import UploadScreen from "../upload-screen";

/**
 * The sidebar app at ANY width. /app is the product's address and shows
 * this same layout on a wide screen (app-frame.tsx); this page is where
 * the layout was previewed and stays as the way to open it on a narrow
 * window. Same UploadScreen, same account, same save paths. Unlisted like
 * /app: noindex, and not in lib/site.ts PUBLIC_PAGES, so the sitemap never
 * names it.
 */
export const metadata: Metadata = {
  title: "contado for desktop",
  robots: { index: false, follow: false },
};

export default function DesktopAppPage() {
  return <UploadScreen layout="desktop" returnTo="/demooo" />;
}
