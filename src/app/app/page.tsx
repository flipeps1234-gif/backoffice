import type { Metadata } from "next";
import BrandHome from "../brand-home";
import LocalePicker from "../locale-picker";
import UploadScreen from "../upload-screen";

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
 * root (public surface, 2026-08-16). Everything else is unchanged: the
 * sign-in gate, the demo word, and anonymous in-memory mode all live
 * inside UploadScreen exactly as before — a logged-out visitor here sees
 * the sign-in screen, which IS the app's front door.
 */
export default function AppPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 lg:max-w-5xl lg:px-8">
      {/* The picker lives in the permanent header — every screen, every
          state, including signed-out. A language switcher you have to hunt
          for might as well not exist. */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">
          {/* The mark and the word are one link to the APP's home (the hub),
              the way the public header's brand link goes to the site's
              homepage — each surface points at its own front door. See
              brand-home.tsx for why a click goes home in place rather than
              reloading the page. */}
          <BrandHome />
        </h1>
        <LocalePicker compact />
      </div>
      <UploadScreen />
    </main>
  );
}
