import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import PrivacyContent from "./privacy-content";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description:
    "The privacy promise in plain words: no selling data, no ads, no bank login, screenshots read and discarded, export and delete any time.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <PrivacyContent />;
}
