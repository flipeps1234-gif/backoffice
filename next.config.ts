import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nothing in the product embeds itself in an iframe, so framing is
  // denied everywhere: /app is device-auth with one-tap money actions
  // and an account-deletion flow — the classic clickjacking targets —
  // and the marketing pages carry the founding signup form. Next ships
  // NO anti-framing header by default. frame-ancestors is the standard;
  // X-Frame-Options covers pre-CSP browsers.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
