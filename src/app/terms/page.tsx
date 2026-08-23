import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import TermsContent from "./terms-content";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  description:
    "contado's terms in plain words — the same short text every user reads and accepts before their first upload.",
  path: "/terms",
});

export default function TermsPage() {
  return <TermsContent />;
}
