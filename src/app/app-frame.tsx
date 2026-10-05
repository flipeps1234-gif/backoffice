"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import BrandHome from "./brand-home";
import { DesktopGate } from "./desktop-shell";
import LocalePicker from "./locale-picker";
import UploadScreen from "./upload-screen";
import { useLocale } from "./use-locale";

/**
 * /app's frame: the sidebar app (desktop-shell.tsx) on a wide screen, the
 * phone app everywhere else. Same UploadScreen either way.
 *
 * The choice is made ONCE per visit, from the window as it is when the
 * page opens, and then held. A live switch would swap the frame under a
 * mounted Ledger — a half-typed sale, a takeover screen, a write still in
 * the queue — and remounting it instead would drop exactly those. Both
 * layouts already cope with the other size (the sidebar folds into a top
 * bar below lg; the phone app grows its side column at lg), so a window
 * resized or a tablet turned mid-visit keeps working in the layout it
 * opened with, and the next visit picks again.
 */
type Layout = "classic" | "desktop";

/** Tailwind's lg — the breakpoint both layouts already switch on. */
const WIDE = "(min-width: 64rem)";

let picked: Layout | null = null;
const never = () => () => {};
const pick = (): Layout =>
  (picked ??= window.matchMedia(WIDE).matches ? "desktop" : "classic");

/** null = not chosen yet (the server render and the hydration pass, which
 *  cannot know the window). */
const useAppLayout = (): Layout | null => useSyncExternalStore(never, pick, () => null);

function ClassicFrame({ children }: { children: ReactNode }) {
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
      {children}
    </main>
  );
}

export default function AppFrame() {
  const layout = useAppLayout();
  const { t } = useLocale();

  // Leaving /app forgets the choice, so coming back (a client-side
  // navigation keeps this module alive) reads the window again.
  useEffect(
    () => () => {
      picked = null;
    },
    [],
  );

  if (layout === null) {
    // Before the window can be read: both frames' loading line, CSS
    // choosing between them, so neither a phone nor a laptop paints the
    // other one's frame first.
    const loading = <p className="text-sm text-neutral-500">{t("home.loading")}</p>;
    return (
      <>
        <div className="lg:hidden">
          <ClassicFrame>{loading}</ClassicFrame>
        </div>
        <div className="hidden lg:block">
          <DesktopGate>{loading}</DesktopGate>
        </div>
      </>
    );
  }

  if (layout === "desktop") return <UploadScreen layout="desktop" />;
  return (
    <ClassicFrame>
      <UploadScreen />
    </ClassicFrame>
  );
}
