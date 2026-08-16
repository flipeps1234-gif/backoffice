import type { Metadata } from "next";
import TermsContent from "./terms-content";

export const metadata: Metadata = {
  title: "Terms — contado",
  description:
    "contado's terms in plain words — the same short text every user reads and accepts before their first upload.",
};

export default function TermsPage() {
  return <TermsContent />;
}
