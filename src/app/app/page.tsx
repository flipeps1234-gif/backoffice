import type { Metadata } from "next";
import LocalePicker from "../locale-picker";
import Mark from "../mark";
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
          {/* The mark and the word are one link to the homepage, like the
              public header's. A plain <a>, not <Link>: site and app are
              separate documents on purpose (the analytics tag never rides a
              client-side transition either way). The "#top" fragment tells
              the landing page this visit was ASKED for — without it the
              landing bounces every signed-in device straight back here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full-document navigation on purpose, see above */}
          <a href="/#top" className="flex items-center gap-2">
            <Mark />
            contado
          </a>
        </h1>
        <LocalePicker compact />
      </div>
      <UploadScreen />
    </main>
  );
}
