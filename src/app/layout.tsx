import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Analytics from "./analytics";
import { OG_BASE, TW_BASE } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Site-wide SEO defaults. Every public page sets its own title and
 * description; this is what they inherit — the title suffix, the
 * canonical base, the share-card defaults, and an explicit "index me".
 * metadataBase comes from lib/site.ts so the custom domain is one env var.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — your payments, turned into books`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Turn Venmo, Cash App, Zelle and cash into real books in a few taps. Built for cleaners, landscapers and barbers. Free during preview.",
  applicationName: SITE_NAME,
  // The same base every page spreads into its own openGraph/twitter —
  // Next replaces nested objects instead of merging them (lib/seo.ts).
  openGraph: { ...OG_BASE },
  twitter: { ...TW_BASE },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline script below adds/removes the
    // .dark class BEFORE first paint (per the Next flash-prevention
    // guide), so the server-rendered class attribute intentionally
    // differs from what React hydrates against.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          // Runs synchronously during parsing — the theme decision lands
          // before anything paints, so no light-flash on dark devices.
          // Mirrors src/lib/settings.ts (key + resolution); keep in sync.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("contado.theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}`,
          }}
        />
        <script
          // Next 16 and Tailwind 4 are built for Safari 16.4 / Chrome 111 /
          // Firefox 111 (class static blocks in the runtime chunk: Safari
          // 16.4, Chrome 94, Firefox 93). Below that the server HTML paints,
          // the script throws at parse, and /app sat on "Loading…" forever
          // with no word why (compat lens, 2026-10-05). Two probes, no eval
          // (CSP allows plain constructors): RegExp lookbehind arrived in
          // Safari's 16.4 — the audience's real cliff (iPhone 6s/7/SE-1,
          // iPads on iOS 15) — and Object.hasOwn in Chrome 93 / Firefox 92
          // / Safari 15.4, which catches old Android WebViews and Firefox
          // ESR 78 too. The notice is in the server HTML, so it shows
          // precisely when nothing else can run.
          dangerouslySetInnerHTML={{
            __html: `try{new RegExp("(?<=a)b");if(typeof Object.hasOwn!=="function")throw 0}catch(e){document.documentElement.classList.add("old-browser")}`,
          }}
        />
        <p className="old-browser-note hidden border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          <span lang="en">
            This browser is too old for contado. It needs iOS 16.4 or newer (iPhone 8 and later — update in Settings), or a current Chrome, Firefox or Edge on a computer or Android phone.
          </span>
          <br />
          <span lang="es">
            Este navegador es demasiado antiguo para contado. Hace falta iOS 16.4 o más reciente (iPhone 8 en adelante — actualiza en Ajustes), o un Chrome, Firefox o Edge actual en una computadora o un teléfono Android.
          </span>
          <br />
          <span lang="pt">
            Este navegador é antigo demais para o contado. É preciso iOS 16.4 ou mais novo (iPhone 8 em diante — atualize em Ajustes), ou um Chrome, Firefox ou Edge atual num computador ou celular Android.
          </span>
        </p>
        {children}
        {/* Public-site analytics only: gated on an env var, never on /app,
            honors Do Not Track and Global Privacy Control — see
            analytics.tsx. */}
        <Analytics />
      </body>
    </html>
  );
}
