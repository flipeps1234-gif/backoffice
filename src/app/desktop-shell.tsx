"use client";

import type { ReactNode } from "react";
import type { MessageKey } from "@/lib/i18n";
import LocalePicker from "./locale-picker";
import Mark from "./mark";
import { useLocale } from "./use-locale";

/**
 * The desktop app's frame: a black sidebar (the website's banner, turned
 * on its side) beside a grey workspace. Pure layout — which section is
 * showing, and what each one holds, is the Ledger's business
 * (upload-screen.tsx). Below lg the sidebar folds into a top bar whose
 * links scroll sideways, so the same page still works on a phone.
 */

export type DesktopSection =
  | "dashboard"
  | "sale"
  | "expense"
  | "owed"
  | "clients"
  | "products"
  | "history"
  | "upload"
  | "settings";

const NAV: { id: DesktopSection; key: MessageKey }[] = [
  { id: "dashboard", key: "desktop.nav.dashboard" },
  { id: "sale", key: "desktop.nav.logSale" },
  { id: "expense", key: "desktop.nav.logExpense" },
  { id: "owed", key: "desktop.nav.owed" },
  { id: "clients", key: "desktop.nav.clients" },
  { id: "products", key: "desktop.nav.products" },
  { id: "history", key: "desktop.nav.history" },
];

const ICONS: Record<DesktopSection, ReactNode> = {
  dashboard: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  sale: <path d="M12 5v14M5 12h14" />,
  expense: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  owed: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3 3 3 6" />
    </>
  ),
  products: (
    <>
      <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  history: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  upload: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
};

export function NavIcon({ id }: { id: DesktopSection }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[id]}
    </svg>
  );
}

/** Rows waiting to be checked: a number for the eye, a sentence for a
 *  screen reader ("3 to check"), on both the sidebar and the phone bar. */
function ToCheckBadge({ count }: { count: number }) {
  const { t } = useLocale();
  if (count <= 0) return null;
  return (
    <>
      <span aria-hidden="true" className="rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-black tabular-nums">
        {count}
      </span>
      <span className="sr-only">
        {count === 1 ? t("desktop.nav.toCheck.one", { count }) : t("desktop.nav.toCheck.many", { count })}
      </span>
    </>
  );
}

const itemClass = (on: boolean) =>
  `flex h-10 w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 text-left text-sm transition-colors ${
    on ? "bg-[#ededed] font-semibold text-black" : "text-neutral-400 hover:bg-neutral-900 hover:text-[#ededed]"
  }`;

export default function DesktopShell({
  section,
  onNavigate,
  owedCents,
  toCheck,
  email,
  signedIn,
  onSignOut,
  locked = false,
  children,
}: {
  section: DesktopSection;
  onNavigate: (section: DesktopSection) => void;
  owedCents: number;
  /** Payments read from screenshots and not yet confirmed. */
  toCheck: number;
  email: string | null;
  signedIn: boolean;
  onSignOut: () => void;
  /** True while the welcome tour is up: the section links go inert (the
   *  tour is modal); language and sign-out stay usable. */
  locked?: boolean;
  children: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-200 text-foreground lg:flex-row dark:bg-neutral-900">
      <nav
        aria-label={t("desktop.nav.label")}
        className="flex flex-none flex-col gap-4 bg-black px-3 py-4 text-[#ededed] [--background:#000] [--foreground:#ededed] lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:gap-6 lg:overflow-y-auto lg:px-3.5 lg:py-6"
      >
        <div className="flex items-center gap-2.5 px-2.5">
          <Mark className="h-[26px] w-[26px]" />
          <span className="text-xl font-semibold tracking-tight">contado</span>
          <span className="ml-auto lg:hidden">
            <LocalePicker compact onDark />
          </span>
        </div>

        <button
          type="button"
          inert={locked}
          onClick={() => onNavigate("upload")}
          aria-current={section === "upload" ? "page" : undefined}
          className={`hidden h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors lg:flex ${
            section === "upload"
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-[#ededed] text-black hover:bg-white"
          }`}
        >
          <NavIcon id="upload" />
          {t("desktop.nav.upload")}
          <ToCheckBadge count={toCheck} />
        </button>

        <ul inert={locked} className="-mx-3 flex gap-1 overflow-x-auto px-3 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
          <li className="flex-none lg:hidden">
            <button
              type="button"
              onClick={() => onNavigate("upload")}
              aria-current={section === "upload" ? "page" : undefined}
              className={itemClass(section === "upload")}
            >
              <NavIcon id="upload" />
              {t("desktop.nav.upload")}
              <ToCheckBadge count={toCheck} />
            </button>
          </li>
          {NAV.map((item) => {
            const on = section === item.id;
            return (
              <li key={item.id} className="flex-none">
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={on ? "page" : undefined}
                  className={itemClass(on)}
                >
                  <NavIcon id={item.id} />
                  <span className="flex-1">{t(item.key)}</span>
                  {item.id === "owed" && owedCents > 0 && (
                    <span className="h-2 w-2 rounded-full bg-amber-400" role="img" aria-label={t("desktop.nav.owedDot")} />
                  )}
                </button>
              </li>
            );
          })}
          <li className="flex-none lg:hidden">
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              aria-current={section === "settings" ? "page" : undefined}
              className={itemClass(section === "settings")}
            >
              <NavIcon id="settings" />
              {t("settings.title")}
            </button>
          </li>
        </ul>

        <div className="mt-auto hidden flex-col gap-2 lg:flex">
          <button
            type="button"
            inert={locked}
            onClick={() => onNavigate("settings")}
            aria-current={section === "settings" ? "page" : undefined}
            className={itemClass(section === "settings")}
          >
            <NavIcon id="settings" />
            {t("settings.title")}
          </button>
          <div className="px-3">
            <LocalePicker compact onDark />
          </div>
          <div className="flex flex-col gap-1 border-t border-neutral-800 px-3 pt-3 text-xs text-neutral-400">
            {signedIn ? (
              <>
                <span className="truncate" title={email ?? undefined}>
                  {t("desktop.signedInAs", { email: email ?? "" })}
                </span>
                <button type="button" onClick={onSignOut} className="min-h-11 self-start hover:text-[#ededed] hover:underline">
                  {t("home.signOut")}
                </button>
              </>
            ) : (
              <span>{t("desktop.notSignedIn")}</span>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-5 px-4 py-6 lg:px-9 lg:py-8">
        {children}
      </main>
    </div>
  );
}

/**
 * Terms, sign-in, the boot "Loading" line and the welcome tour, in the
 * desktop frame: the website's black banner over a grey page, the gate
 * itself in one centred card. Same components as /app — only framed.
 */
export function DesktopGate({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-200 text-foreground dark:bg-neutral-900">
      <header className="flex items-center justify-between gap-4 bg-black px-4 py-4 text-[#ededed] [--background:#000] [--foreground:#ededed] lg:px-9">
        <span className="flex items-center gap-2.5">
          <Mark className="h-[26px] w-[26px]" />
          <span className="text-xl font-semibold tracking-tight">contado</span>
        </span>
        <LocalePicker compact onDark />
      </header>
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <div className="rounded-xl border border-neutral-300 bg-background p-6 dark:border-neutral-700">{children}</div>
      </div>
    </div>
  );
}
