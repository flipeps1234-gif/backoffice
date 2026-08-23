import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import HelpIndex from "./help-index";
import { loadAllArticles } from "./load";

/** Public, no auth, statically rendered: all three languages ship in
 *  the page and the client shows the device's own (same stance as the
 *  app's i18n — all of them together are smaller than one screenshot).
 *  The root layout appends " — contado" to the title. */
export const metadata: Metadata = pageMetadata({
  title: "Help",
  description:
    "Short answers in plain words: uploading payment screenshots, who owes you, taxes and exports, your account and your data.",
  path: "/help",
});

export default async function HelpPage() {
  const articles = await loadAllArticles();
  return <HelpIndex articles={articles} />;
}
