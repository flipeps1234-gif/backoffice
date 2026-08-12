"use client";

import { useState } from "react";
import type { Client } from "@/lib/client";
import {
  cadenceLabel,
  RECURRING_PAUSE_AFTER_MISSES,
  type RecurringTemplate,
} from "@/lib/recurring";
import { owedCents, saleTotalCents, type Sale } from "@/lib/sale";
import { formatCents } from "@/lib/transaction";

/**
 * Clients: the directory the sale flow builds one save-prompt at a time.
 * List shows who owes what; detail is the client's history, owed total,
 * and their recurring templates with the pause/resume/end controls.
 * Template EDITS apply to future instances only — history is a record.
 */

const labelClass = "mb-1 block text-xs font-medium text-neutral-500";
const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

export default function ClientsPage({
  clients,
  sales,
  templates,
  onUpdateClient,
  onUpdateTemplate,
  onLogAgain,
  onClose,
}: {
  clients: Client[];
  sales: Sale[];
  templates: RecurringTemplate[];
  onUpdateClient: (id: string, patch: Partial<Pick<Client, "name" | "notes">>) => void;
  onUpdateTemplate: (id: string, patch: Partial<RecurringTemplate>) => void;
  onLogAgain: (sale: Sale) => void;
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const detail = clients.find((c) => c.id === openId);

  // ---- detail ----
  if (detail) {
    const theirSales = sales.filter((s) => s.clientId === detail.id);
    const owed = owedCents(theirSales);
    const theirTemplates = templates.filter((t) => t.clientId === detail.id);

    return (
      <div className="space-y-5">
        <div className="flex items-baseline justify-between">
          <button
            type="button"
            className="text-sm text-neutral-500 hover:underline"
            onClick={() => {
              setOpenId(null);
              setEditing(false);
            }}
          >
            ← All clients
          </button>
          <button
            type="button"
            className="text-sm text-neutral-500 hover:underline"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="client-name">
                Name
              </label>
              <input
                id="client-name"
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="client-notes">
                Notes
              </label>
              <textarea
                id="client-notes"
                className={fieldClass}
                rows={3}
                placeholder="Gate code, dog's name, prefers Tuesdays…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={name.trim() === ""}
                className="flex-1 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
                onClick={() => {
                  onUpdateClient(detail.id, {
                    name: name.trim(),
                    notes: notes.trim(),
                  });
                  setEditing(false);
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-neutral-400 px-4 py-3 text-sm font-medium"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold">{detail.name}</h2>
            {detail.notes && (
              <p className="mt-1 text-sm text-neutral-500">{detail.notes}</p>
            )}
            <button
              type="button"
              className="mt-1 text-sm text-neutral-500 hover:underline"
              onClick={() => {
                setName(detail.name);
                setNotes(detail.notes);
                setEditing(true);
              }}
            >
              Edit
            </button>
          </div>
        )}

        {owed > 0 && (
          <p className="rounded-lg bg-neutral-100 px-4 py-3 text-sm dark:bg-neutral-900">
            Owes <strong className="tabular-nums">{formatCents(owed)}</strong>
          </p>
        )}

        {theirTemplates.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium">Recurring</h3>
            <ul className="space-y-2">
              {theirTemplates.map((tpl) => (
                <li
                  key={tpl.id}
                  className="rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {tpl.lineItems.map((i) => i.name).join(", ") || "Sale"}{" "}
                        · {formatCents(saleTotalCents(tpl))}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {cadenceLabel(tpl.cadence)}
                        {tpl.active
                          ? ` · next ${tpl.nextDue}`
                          : " · paused"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                        onClick={() =>
                          onUpdateTemplate(tpl.id, {
                            active: !tpl.active,
                            // Resuming forgives the misses that paused it —
                            // otherwise it re-pauses on the next generation.
                            ...(tpl.active ? {} : { consecutiveMisses: 0 }),
                          })
                        }
                      >
                        {tpl.active ? "Pause" : "Resume"}
                      </button>
                    </div>
                  </div>
                  {!tpl.active &&
                    tpl.consecutiveMisses >= RECURRING_PAUSE_AFTER_MISSES && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        {tpl.consecutiveMisses} missed — still active? Resume
                        if so, or leave it paused.
                      </p>
                    )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-medium">History</h3>
          {theirSales.length === 0 ? (
            <p className="text-sm text-neutral-500">No sales yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
              {theirSales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {sale.lineItems.map((i) => i.name).join(", ") || "Sale"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {sale.date} ·{" "}
                      {sale.state === "open"
                        ? "owes you"
                        : sale.state === "expected"
                          ? "paid, waiting to match"
                          : sale.method === "cash"
                            ? "paid cash"
                            : "paid"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCents(saleTotalCents(sale))}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                    onClick={() => onLogAgain(sale)}
                  >
                    Log again
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // ---- list ----
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Clients</h2>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No clients yet. They save themselves when you log sales — name a
          client at checkout and tap “save”.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {[...clients]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((client) => {
              const owed = owedCents(
                sales.filter((s) => s.clientId === client.id),
              );
              const paused = templates.some(
                (t) =>
                  t.clientId === client.id &&
                  !t.active &&
                  t.consecutiveMisses >= RECURRING_PAUSE_AFTER_MISSES,
              );
              return (
                <li key={client.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    onClick={() => setOpenId(client.id)}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {client.name}
                      {paused && (
                        <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">
                          recurring paused
                        </span>
                      )}
                    </span>
                    {owed > 0 && (
                      <span className="text-sm tabular-nums text-neutral-500">
                        owes {formatCents(owed)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
