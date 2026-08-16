import type { Metadata } from "next";
import Landing from "./landing";

/**
 * The public landing page took the root; the app itself lives at /app
 * (see src/app/app/page.tsx). Signed-in visitors are bounced to /app by
 * the Landing component — auth is device-local, so the server can't
 * know; the page renders either way and the bounce is instant.
 */
export const metadata: Metadata = {
  title: "contado — your payments, turned into books",
  description:
    "Turn Venmo, Cash App, Zelle and cash into real books, automatically. Built for cleaners, landscapers and barbers. Free.",
};

export default function Home() {
  return <Landing />;
}
