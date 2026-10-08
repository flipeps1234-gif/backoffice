"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { MessageKey } from "@/lib/i18n";
import LocalePicker from "./locale-picker";
import Mark from "./mark";
import SkipLink from "./skip-link";
import { useLocale } from "./use-locale";

/**
 * The desktop app's frame: a black sidebar (the website's banner, turned
 * on its side) beside a grey workspace. Pure layout — which section is
 * showing, and what each one holds, is the Ledger's business
 * (upload-screen.tsx). Below lg it is the phone app (2026-10-07, look B
 * of the mobile redesign, previewed at /demoo): a slim black banner whose
 * menu button slides the same sidebar in from the left. The old phone
 * layout lives on at /app/classic.
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

/** A row of the sidebar (40px) or of the phone menu (44px, the tap minimum
 *  in design-tokens.md). */
const itemClass = (on: boolean, phone: boolean) =>
  `flex ${phone ? "h-11" : "h-10"} w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 text-left text-sm transition-colors ${
    on ? "bg-[#ededed] font-semibold text-black" : "text-neutral-400 hover:bg-neutral-900 hover:text-[#ededed]"
  }`;

/** Where the phone layout ends: Tailwind's lg, as the classes below use it. */
const WIDE = "(min-width: 64rem)";

/** Calls `close` at once if the window is already wide, and again whenever
 *  it becomes wide; returns the unsubscribe. The phone menu's drawer is
 *  `lg:hidden`, so a window that reaches lg (a tablet turned, a desktop
 *  window widened) must also CLOSE it — or the page stays inert and
 *  scroll-locked behind a menu nobody can see (2026-10-08 review).
 *  Separate from the component so the unit test can drive it. */
export function closeWhenWide(
  query: Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">,
  close: () => void,
): () => void {
  const shut = () => {
    if (query.matches) close();
  };
  shut();
  query.addEventListener("change", shut);
  return () => query.removeEventListener("change", shut);
}

/** Fired by the links between the two layouts ("Classic phone layout",
 *  "New layout"): they load the other layout's page, so the mounted Ledger
 *  answers first — preventDefault() means "not now" (an entry is open, or a
 *  save is still on its way), and it says why. Nothing listening (the
 *  gates): the link loads. */
export const LAYOUT_EVENT = "contado:layout";

/** A click on a layout link: ask the Ledger (LAYOUT_EVENT), and keep the
 *  page when it says no. Modifier and middle clicks open a new tab — this
 *  page stays, so nothing is at risk: those are left to the browser.
 *  Returns false when the switch was refused. */
export function askToSwitchLayout(event: MouseEvent<HTMLAnchorElement>): boolean {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return true;
  }
  const ask = new CustomEvent(LAYOUT_EVENT, { cancelable: true });
  window.dispatchEvent(ask);
  if (!ask.defaultPrevented) return true;
  event.preventDefault();
  return false;
}

/** A line the page shows in its sticky notice block (an error, a save
 *  waiting or landed). The phone menu repeats the ones that arrive while it
 *  is open: the page behind it is inert — out of reach and silent to a
 *  screen reader — and covered. */
export type ShellAlert = { text: string; tone: "red" | "amber" | "green" };

const ALERT_CLASS: Record<ShellAlert["tone"], string> = {
  red: "border-red-200 bg-red-50 text-red-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export default function DesktopShell({
  section,
  onNavigate,
  owedCents,
  toCheck,
  email,
  signedIn,
  onSignOut,
  locked = false,
  alerts = [],
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
  /** The lines the page's sticky notice block shows right now. */
  alerts?: ShellAlert[];
  children: ReactNode;
}) {
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // What the notice block already said when the menu opened is not news;
  // a line that arrives (or changes) while it is open is repeated inside
  // it, where a person and a screen reader can reach it. The lines on show
  // at opening are remembered by state set during render — React's way of
  // deriving from the previous render.
  const alertKey = (alert: ShellAlert) => `${alert.tone}:${alert.text}`;
  const [alertsAtOpen, setAlertsAtOpen] = useState<string[] | null>(null);
  if (menuOpen && alertsAtOpen === null) setAlertsAtOpen(alerts.map(alertKey));
  if (!menuOpen && alertsAtOpen !== null) setAlertsAtOpen(null);
  const freshAlerts =
    menuOpen && alertsAtOpen !== null ? alerts.filter((alert) => !alertsAtOpen.includes(alertKey(alert))) : [];

  // The phone menu is modal: the page behind it does not scroll, focus
  // starts on Close and goes back to the menu button when it shuts — from
  // the cleanup, because the banner is inert until that render. Escape is
  // heard on the document, not only inside the menu: focus can leave it
  // (a click on its blank space puts focus on <body>), and Escape must
  // still close it. A window that reaches lg closes it too (closeWhenWide);
  // the cleanup — which also runs on unmount — releases the lock either way.
  useEffect(() => {
    if (!menuOpen) return;
    const before = document.body.style.overflow;
    const opener = menuButton.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    const stopWide = closeWhenWide(window.matchMedia(WIDE), () => setMenuOpen(false));
    closeButton.current?.focus();
    return () => {
      stopWide();
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = before;
      // Hidden at lg (lg:hidden): focus() there would land nowhere useful.
      if (opener && opener.getClientRects().length > 0) opener.focus();
    };
  }, [menuOpen]);
  const go = (next: DesktopSection) => {
    setMenuOpen(false);
    onNavigate(next);
  };

  /** The sections, the account line and the language: the sidebar on a
   *  wide screen, the slide-in menu on a phone. */
  const navBody = (phone: boolean) => (
    <>
      <button
        type="button"
        inert={locked}
        onClick={() => go("upload")}
        aria-current={section === "upload" ? "page" : undefined}
        className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
          phone || section === "upload"
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : "bg-[#ededed] text-black hover:bg-white"
        }`}
      >
        <NavIcon id="upload" />
        {t("desktop.nav.upload")}
        <ToCheckBadge count={toCheck} />
      </button>

      <ul inert={locked} className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const on = section === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(item.id)}
                aria-current={on ? "page" : undefined}
                className={itemClass(on, phone)}
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
      </ul>

      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          inert={locked}
          onClick={() => go("settings")}
          aria-current={section === "settings" ? "page" : undefined}
          className={itemClass(section === "settings", phone)}
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
              <button
                type="button"
                onClick={() => {
                  // From the phone menu: close it FIRST (committed now, not
                  // after the handler), so the confirm opens over the page
                  // and a refusal ("couldn't sign out…") lands in a <main>
                  // that is no longer inert — seen, and announced.
                  if (phone) flushSync(() => setMenuOpen(false));
                  onSignOut();
                }}
                className="min-h-11 self-start hover:text-[#ededed] hover:underline"
              >
                {t("home.signOut")}
              </button>
            </>
          ) : (
            <span>{t("desktop.notSignedIn")}</span>
          )}
          {phone && (
            // The old phone layout, kept: a full page load, so the two
            // layouts never share a mounted Ledger — which is why the Ledger
            // is asked first (LAYOUT_EVENT). Refused: the menu closes so its
            // reason shows.
            <a
              href="/app/classic"
              onClick={(event) => {
                if (!askToSwitchLayout(event)) setMenuOpen(false);
              }}
              className="flex min-h-11 items-center hover:text-[#ededed] hover:underline"
            >
              {t("desktop.nav.classic")}
            </a>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-200 text-foreground lg:flex-row dark:bg-neutral-900">
      {/* First in the page: past the banner or the sidebar to <main>. */}
      <SkipLink inert={menuOpen} />
      {/* Phone: the slim black banner. Sticky, so globals.css pads focus
          scrolling below it (data-app-banner). */}
      <header
        inert={menuOpen}
        data-app-banner
        className="sticky top-0 z-30 flex h-14 flex-none items-center gap-1 bg-black pl-1.5 pr-3 text-[#ededed] [--background:#000] [--foreground:#ededed] lg:hidden"
      >
        <button
          ref={menuButton}
          type="button"
          aria-label={t("desktop.nav.open")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-neutral-900"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <button
          type="button"
          inert={locked}
          onClick={() => go("dashboard")}
          className="flex min-h-11 items-center gap-2.5 rounded-lg pr-2"
        >
          <Mark className="h-[26px] w-[26px]" />
          <span className="text-xl font-semibold tracking-tight">contado</span>
        </button>
        <span className="ml-auto flex items-center">
          {toCheck > 0 ? (
            <button
              type="button"
              inert={locked}
              onClick={() => go("upload")}
              className="flex min-h-11 items-center gap-2 px-1 text-[13px] text-neutral-400 hover:text-[#ededed]"
            >
              <span aria-hidden="true">{t("desktop.nav.toCheckShort")}</span>
              <ToCheckBadge count={toCheck} />
            </button>
          ) : (
            <LocalePicker compact onDark />
          )}
        </span>
      </header>

      {/* Wide screen: the sidebar. */}
      <nav
        aria-label={t("desktop.nav.label")}
        className="sticky top-0 hidden h-screen w-64 flex-none flex-col gap-6 overflow-y-auto bg-black px-3.5 py-6 text-[#ededed] [--background:#000] [--foreground:#ededed] lg:flex"
      >
        <div className="flex items-center gap-2.5 px-2.5">
          <Mark className="h-[26px] w-[26px]" />
          <span className="text-xl font-semibold tracking-tight">contado</span>
        </div>
        {navBody(false)}
      </nav>

      <main
        id="content"
        tabIndex={-1}
        inert={menuOpen}
        className="mx-auto flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-5 px-4 py-6 outline-none lg:px-9 lg:py-8"
      >
        {children}
      </main>

      {/* Phone: the same sidebar, sliding in over a dimmed page. */}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("desktop.nav.label")}
          className="fixed inset-0 z-50 lg:hidden"
        >
          {/* The dimmed page is a way out for a pointer; keyboards have
              Close and Escape, so it stays out of the tab order. */}
          <div aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <nav
            aria-label={t("desktop.nav.label")}
            className="absolute inset-y-0 left-0 flex w-[304px] max-w-[85%] flex-col gap-4 overflow-y-auto border-r border-neutral-700 bg-black px-3.5 pb-6 pt-1.5 text-[#ededed] [--background:#000] [--foreground:#ededed]"
          >
            <div className="flex items-center justify-between pl-2">
              <span className="flex items-center gap-2.5">
                <Mark className="h-[26px] w-[26px]" />
                <span className="text-xl font-semibold tracking-tight">contado</span>
              </span>
              <button
                ref={closeButton}
                type="button"
                aria-label={t("desktop.nav.close")}
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-neutral-900"
              >
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {/* The page's notices that arrived while the menu is open (see
                freshAlerts): mounted with the menu, so a line inserted here
                is announced. */}
            <div className="flex flex-col gap-2 empty:hidden">
              {freshAlerts.map((alert) => (
                <p
                  key={alertKey(alert)}
                  role={alert.tone === "green" ? "status" : "alert"}
                  className={`rounded-md border px-3 py-2 text-sm ${ALERT_CLASS[alert.tone]}`}
                >
                  {alert.text}
                </p>
              ))}
            </div>
            {navBody(true)}
          </nav>
        </div>
      )}
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
      <SkipLink />
      <header className="flex items-center justify-between gap-4 bg-black px-4 py-4 text-[#ededed] [--background:#000] [--foreground:#ededed] lg:px-9">
        {/* The page's h1 and <main>, as the phone frame has (app-frame.tsx):
            terms, sign-in and the tour start at h2 or have no heading, so
            without these a screen reader found no heading and no main on
            /app's front door. */}
        <h1 className="flex items-center gap-2.5">
          <Mark className="h-[26px] w-[26px]" />
          <span className="text-xl font-semibold tracking-tight">contado</span>
        </h1>
        <LocalePicker compact onDark />
      </header>
      <main id="content" tabIndex={-1} className="mx-auto w-full max-w-xl px-4 py-10 outline-none">
        <div className="rounded-xl border border-neutral-300 bg-background p-6 dark:border-neutral-700">{children}</div>
      </main>
    </div>
  );
}
