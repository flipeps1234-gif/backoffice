"use client";

import { formatCents } from "@/lib/transaction";
import { DEMO_TODAY, daysBetween, shortDate, type Client, type Sale } from "./data";
import { AgeChip, ScreenHeader, card, smallBtn } from "./ui";

export default function OwedScreen({
  sales,
  clients,
  onPaid,
  onClient,
}: {
  sales: Sale[];
  clients: Client[];
  onPaid: (saleId: string, how: "cash" | "waiting") => void;
  onClient: (clientId: string) => void;
}) {
  const owed = sales
    .filter((s) => s.status === "owed")
    .sort((a, b) => a.date.localeCompare(b.date));
  const waiting = sales.filter((s) => s.status === "waiting");
  const total = owed.reduce((t, s) => t + s.totalCents, 0);
  const name = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "No client";

  return (
    <>
      <ScreenHeader title="Owed" sub="Sales nobody has paid for yet, oldest first." />
      <section className={`${card} flex flex-col gap-1 p-5`}>
        <span className="text-xs uppercase tracking-wide text-[#737373]">Owed to you</span>
        <span className="text-4xl font-semibold tabular-nums text-amber-700">{formatCents(total)}</span>
        <span className="text-sm text-[#737373]">
          {owed.length === 0
            ? "Nobody owes you anything. As it should be."
            : `${owed.length} ${owed.length === 1 ? "sale" : "sales"} · oldest is ${daysBetween(owed[0].date, DEMO_TODAY)} days`}
        </span>
      </section>

      {owed.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-300 bg-white">
          {owed.map((s) => {
            const days = daysBetween(s.date, DEMO_TODAY);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {s.clientId ? (
                      <button
                        type="button"
                        onClick={() => onClient(s.clientId!)}
                        className="text-base font-semibold underline-offset-2 hover:underline"
                      >
                        {name(s.clientId)}
                      </button>
                    ) : (
                      <span className="text-base font-semibold">No client</span>
                    )}
                    <AgeChip days={days} />
                  </div>
                  <span className="truncate text-sm text-[#737373]">
                    {shortDate(s.date)} · {s.lines.map((l) => (l.qty > 1 ? `${l.label} × ${l.qty}` : l.label)).join(", ")}
                  </span>
                </div>
                <span className="text-lg font-semibold tabular-nums text-amber-700">{formatCents(s.totalCents)}</span>
                <div className="flex gap-2">
                  <button type="button" className={smallBtn} onClick={() => onPaid(s.id, "cash")}>
                    Paid cash
                  </button>
                  <button type="button" className={smallBtn} onClick={() => onPaid(s.id, "waiting")}>
                    Paid digitally
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {waiting.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[#404040]">Marked paid, waiting to match</h2>
          <p className="text-sm text-[#525252]">
            In the app these match themselves to the Venmo, Zelle or Cash App payment when you upload
            your screenshots.
          </p>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-300 bg-white">
            {waiting.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{name(s.clientId)}</span>
                  <span className="text-xs text-[#737373]">{shortDate(s.date)}</span>
                </div>
                <span className="text-sm tabular-nums text-[#525252]">{formatCents(s.totalCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
