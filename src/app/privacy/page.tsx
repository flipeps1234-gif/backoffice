import type { Metadata } from "next";
import PrivacyContent from "./privacy-content";

export const metadata: Metadata = {
  title: "Privacy — contado",
  description:
    "The privacy promise in plain words: no selling data, no ads, no bank login, screenshots read and discarded, export and delete any time.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
