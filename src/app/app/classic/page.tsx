import type { Metadata } from "next";
import ClassicApp from "./classic-app";

/** The phone layout /app had until 2026-10-07, kept at its own address.
 *  Not content: noindex, like /app itself. */
export const metadata: Metadata = {
  title: "Open the app",
  robots: { index: false, follow: false },
};

export default function ClassicPage() {
  return <ClassicApp />;
}
