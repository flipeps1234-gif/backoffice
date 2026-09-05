import type { Metadata } from "next";
import { Suspense } from "react";
import BrandHome from "../../brand-home";
import LocalePicker from "../../locale-picker";
import AdminScreen from "../../admin-screen";

/** Owner tooling, not content: noindex like the app shell it lives under
 *  (robots.ts leaves /app fetchable precisely so this tag can be read). */
export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

/**
 * /app/admin — the owner's view across every account: money logged,
 * activity, uploads, the account list, storage headroom. The page itself
 * is a shell; every number comes from /api/admin/overview, which answers
 * only a session whose email is on OWNER_EMAILS. Anyone else sees the
 * same header and a one-line explanation, never data.
 */
export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 lg:max-w-5xl lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">
          <BrandHome />
        </h1>
        <LocalePicker compact />
      </div>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <AdminScreen />
      </Suspense>
    </main>
  );
}
