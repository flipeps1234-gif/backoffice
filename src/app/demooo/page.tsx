import type { Metadata } from "next";
import UploadScreen from "../upload-screen";

/**
 * The desktop app, in preview: the black-sidebar layout (design E on the
 * "Contado Desktop Redesign" canvas) over the REAL product — sign-in, the
 * account's own ledger, every save path /app uses. Same UploadScreen,
 * `layout="desktop"`; /app is untouched. Unlisted like /app: noindex, and
 * not in lib/site.ts PUBLIC_PAGES, so the sitemap never names it.
 */
export const metadata: Metadata = {
  title: "contado for desktop",
  robots: { index: false, follow: false },
};

export default function DesktopAppPage() {
  return <UploadScreen layout="desktop" />;
}
