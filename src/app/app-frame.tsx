"use client";

import type { ReactNode } from "react";
import BrandHome from "./brand-home";
import LocalePicker from "./locale-picker";
import SkipLink from "./skip-link";
import UploadScreen from "./upload-screen";
import { useLocale } from "./use-locale";

/**
 * /app's frame. Since 2026-10-07 every width gets the same app
 * (desktop-shell.tsx): the sidebar on a wide screen, and below lg the
 * phone layout of the mobile redesign (look B — a slim black banner, the
 * sidebar as a slide-in menu). One component tree at every size, so no
 * width has to be picked at load and a turned tablet keeps working.
 *
 * The phone layout /app had until then lives on at /app/classic
 * (ClassicFrame below), linked from the phone menu.
 */
export default function AppFrame() {
  return <UploadScreen layout="desktop" />;
}

/** The classic phone frame: the brand and the language picker over the
 *  hub, and the hub as the page's <main> (the skip link's target). Used by
 *  /app/classic. */
export function ClassicFrame({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 lg:max-w-5xl lg:px-8">
      <SkipLink />
      {/* The picker lives in the permanent header — every screen, every
          state, including signed-out. A language switcher you have to hunt
          for might as well not exist. */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">
          {/* The mark and the word are one link to the APP's home (the hub);
              see brand-home.tsx. */}
          <BrandHome />
        </h1>
        <span className="flex items-center gap-3">
          {/* A full page load to the new layout, so the two never share a
              mounted Ledger. */}
          <a href="/app" className="-mx-1 min-h-11 px-1 py-3 text-xs text-neutral-600 hover:underline dark:text-neutral-400">
            {t("home.newLayout")}
          </a>
          <LocalePicker compact />
        </span>
      </div>
      <main id="content" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </div>
  );
}
