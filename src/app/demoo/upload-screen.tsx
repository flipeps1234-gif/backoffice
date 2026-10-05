"use client";

import { formatCents } from "@/lib/transaction";
import { dayLabel, type Pending } from "./data";
import { ScreenHeader, card, primaryBtn, secondaryBtn } from "./ui";

/**
 * Upload screenshots, as far as a demo can go: the three sample payments
 * are already "read", and checking each one files it. Adding real
 * screenshots is the app's job — this page says so instead of faking a
 * file picker that would upload nothing.
 */
export default function UploadScreen({
  pending,
  onCheck,
}: {
  pending: Pending[];
  onCheck: (id: string, business: boolean) => void;
}) {
  return (
    <>
      <ScreenHeader
        title="Upload screenshots"
        sub="Venmo, Cash App or Zelle. contado reads them; you check each payment before it counts."
      />
      <p className="rounded-xl border-2 border-dashed border-[#737373] px-4 py-3 text-sm text-[#404040]">
        In the app, this is where you add screenshots. This demo starts with three payments already
        read, waiting for you to check.
      </p>

      {pending.length === 0 ? (
        <section className={`${card} flex flex-col items-start gap-3 p-5`}>
          <h2 className="text-base font-semibold">All checked</h2>
          <p className="text-sm text-[#525252]">
            Nothing is waiting. Each payment you kept as business now counts on the dashboard and in History.
          </p>
          <a href="/app" className={primaryBtn}>
            Open the app
          </a>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((p) => (
            <li key={p.id} className={`${card} flex flex-col gap-3 p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold">{p.name}</span>
                  <span className="text-[13px] text-[#525252]">
                    {dayLabel(p.date)} · {p.what}
                  </span>
                </div>
                <span
                  className={`text-lg font-semibold tabular-nums ${p.dir === "in" ? "text-emerald-700" : "text-red-700"}`}
                >
                  {p.dir === "in" ? "+" : "−"}
                  {formatCents(p.cents)}
                </span>
              </div>
              <span className="self-start rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-[#525252] ring-1 ring-neutral-200">
                Read from {p.app}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={primaryBtn} onClick={() => onCheck(p.id, true)}>
                  Business
                </button>
                <button type="button" className={secondaryBtn} onClick={() => onCheck(p.id, false)}>
                  Personal
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
