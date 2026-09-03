import type { NextConfig } from "next";

// Supabase project origin, derived from the env var rather than hardcoded
// so a different project (e.g. a preview env) doesn't silently ship a
// CSP pointed at production data. Absent locally (no env file), the
// Supabase entries are simply omitted rather than crashing the build.
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
})();
const supabaseWsOrigin = supabaseOrigin
  ? `wss://${supabaseOrigin.replace(/^https?:\/\//, "")}`
  : null;

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' covers the inline dark-mode flash-prevention script
  // in layout.tsx; 'unsafe-eval' is added only in dev because Next's
  // HMR/Fast Refresh needs it, never shipped to production.
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${
    isDev ? " 'unsafe-eval'" : ""
  }`,
  // Supabase (data + realtime) and GA4's collection endpoints.
  [
    "connect-src 'self'",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
    ...(supabaseWsOrigin ? [supabaseWsOrigin] : []),
    "https://www.googletagmanager.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.g.doubleclick.net",
  ].join(" "),
  // data: for sale photos stored as data URLs, blob: for the CSV
  // download link; GA4 pixel hosts for its image-beacon fallback.
  "img-src 'self' data: blob: https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net",
  // 'unsafe-inline' covers Tailwind/Next's injected style tags — no
  // external stylesheet is loaded (next/font self-hosts).
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts the Geist fonts under /_next, no external host.
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  // Nothing embeds an iframe or a plugin object.
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Belt and braces with X-Frame-Options below: nothing embeds this app.
  "frame-ancestors 'none'",
  // Upgrade any stray http:// asset reference to https:// instead of
  // silently dropping it.
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Nothing in the product embeds itself in an iframe, so framing is
  // denied everywhere: /app is device-auth with one-tap money actions
  // and an account-deletion flow — the classic clickjacking targets —
  // and the marketing pages carry the founding signup form. Next ships
  // NO security headers by default, so the full set below is explicit:
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Locks down which origins can load/execute/connect — the
          // primary defense against XSS exfiltration and clickjacking
          // (frame-ancestors 'none' below duplicates X-Frame-Options
          // for browsers that only understand CSP).
          { key: "Content-Security-Policy", value: csp },
          // Forces HTTPS for this host and its subdomains for two years,
          // including on the very first visit once preloaded.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Stops the browser from guessing a response's MIME type,
          // which blocks disguised-script/content-sniffing attacks.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sends the full URL only to same-origin requests, and just
          // the origin cross-origin — no path/query leakage to third
          // parties via the Referer header.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Denies browser features this app never uses, so an XSS or
          // a compromised third-party script can't invoke them.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
          // Isolates this origin's window from cross-origin openers,
          // closing a class of cross-window side-channel attacks.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // X-Frame-Options covers pre-CSP browsers.
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
