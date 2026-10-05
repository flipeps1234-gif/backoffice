import type { Metadata } from "next";
import AppFrame from "../app-frame";

/** The sign-in gate is not content: its own title, and an explicit
 *  noindex so search engines don't list the bare URL that every public
 *  page's "Open the app" button points at (robots.ts lets it be fetched
 *  precisely so this tag can be read). */
export const metadata: Metadata = {
  title: "Open the app",
  robots: { index: false, follow: false },
};

/**
 * The app itself, moved from / to /app when the landing page took the
 * root (public surface, 2026-08-16). The sign-in gate and anonymous
 * in-memory mode both live inside UploadScreen — a logged-out visitor
 * here sees the sign-in screen, which IS the app's front door.
 *
 * Since 2026-10-04 a wide screen gets the sidebar app that was previewed
 * at /demooo and a phone keeps the layout it has always had; app-frame.tsx
 * makes that choice (and holds the phone header that used to live here).
 */
export default function AppPage() {
  return <AppFrame />;
}
