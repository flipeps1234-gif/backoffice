import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base for OG/twitter image URLs on every page's metadata.
  metadataBase: new URL("https://backoffice-nine-blond.vercel.app"),
  title: "contado",
  description: "Snap your payment screenshots. We do the bookkeeping.",
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
      </body>
    </html>
  );
}
