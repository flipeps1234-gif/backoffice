import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Analytics from "./analytics";
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
    "Turn Venmo, Cash App, Zelle and cash into real books, automatically. Built for cleaners, landscapers and barbers. Free.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    alternateLocale: ["es_419", "pt_BR"],
  },
  twitter: { card: "summary_large_image" },
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
        {children}
        {/* Public-site analytics only: gated on an env var, never on /app,
            honors Do Not Track — see analytics.tsx. */}
        <Analytics />
      </body>
    </html>
  );
}
