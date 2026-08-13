"use client";

import { useState } from "react";
import type { Client } from "@/lib/client";
import {
  cadenceLabel,
  fastForwardPastGap,
  RECURRING_PAUSE_AFTER_MISSES,
  type RecurringTemplate,
} from "@/lib/recurring";
import {
  lineFromService,
  lineTotalCents,
  owedCents,
  saleTotalCents,
  type LineItem,
  type Sale,
} from "@/lib/sale";
import type { Service } from "@/lib/service";
import { dollarsToCents, formatCents } from "@/lib/transaction";

/**
 * Clients: the directory the sale flow builds one save-prompt at a time.
 * List shows who owes what; detail is the client's history, owed total,
 * and their recurring templates with the pause/resume/end controls.
 * Template EDITS apply to future instances only — history is a record.
 */

const localToday = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const labelClass = "mb-1 block text-xs font-medium text-neutral-500";
const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";
/** fieldClass minus w-full: inside a flex row, w-full starves the flex
 *  siblings (the line's name label truncated to nothing) — a fixed narrow
 *  width that never grows is the point here. */
const narrowFieldClass =
  "shrink-0 rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

/** A draft line keeps quantity as TEXT while the owner types — "2." must
 *  not snap to 2 under their thumb. Parsed and validated at save. */
type DraftLine = { item: LineItem; qtyText: string };

const parseQty = (text: string): number | null => {
  const qty = Number.parseFloat(text);
  return Number.isFinite(qty) && qty > 0 ? qty : null;
};

export default function ClientsPage({
  clients,
  sales,
  templates,
  services,
  onUpdateClient,
  onUpdateTemplate,
  onLogAgain,
  onClose,
}: {
  clients: Client[];
  sales: Sale[];
  templates: RecurringTemplate[];
  services: Service[];
  onUpdateClient: (id: string, patch: Partial<Pick<Client, "name" | "notes">>) => void;
  onUpdateTemplate: (id: string, patch: Partial<RecurringTemplate>) => void;
  onLogAgain: (sale: Sale) => void;
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  // ---- template edit/end state (one template at a time) ----
  const [editTplId, setEditTplId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [customAmount, setCustomAmount] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [endConfirmId, setEndConfirmId] = useState<string | null>(null);

  function startTemplateEdit(tpl: RecurringTemplate) {
    setEditTplId(tpl.id);
    setDraft(
      tpl.lineItems.map((item) => ({
        item: { ...item },
        qtyText: String(item.quantity),
      })),
    );
    setCustomAmount("");
    setCustomLabel("");
    setEndConfirmId(null);
  }

  function closeTemplateEdit() {
    setEditTplId(null);
    setDraft([]);
  }

  /** Lines rebuilt from the draft, or null while any quantity is invalid. */
  function draftLines(): LineItem[] | null {
    const items: LineItem[] = [];
    for (const { item, qtyText } of draft) {
      const quantity = parseQty(qtyText);
      if (quantity === null) return null;
      items.push({ ...item, quantity });
    }
    return items.length > 0 ? items : null;
  }

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
              {theirTemplates.map((tpl) => {
                const ended = tpl.endedOn !== null;
                const isEditing = editTplId === tpl.id;
                const built = isEditing ? draftLines() : null;
                return (
                  <li
                    key={tpl.id}
                    className="rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          {tpl.lineItems.map((i) => i.name).join(", ") ||
                            "Sale"}{" "}
                          · {formatCents(saleTotalCents(tpl))}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {cadenceLabel(tpl.cadence)}
                          {ended
                            ? ` · ended ${tpl.endedOn}`
                            : tpl.active
                              ? ` · next ${tpl.nextDue}`
                              : " · paused"}
                        </p>
                      </div>
                      {/* Ended templates are a record, not a control panel. */}
                      {!ended && !isEditing && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                            onClick={() => startTemplateEdit(tpl)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                            onClick={() =>
                              onUpdateTemplate(tpl.id, {
                                active: !tpl.active,
                                // Resuming forgives the misses that paused it —
                                // otherwise it re-pauses on the next generation —
                                // and fast-forwards past the paused gap. Without
                                // that, generation back-fills every skipped due
                                // date as OPEN sales the client never owed and
                                // re-pauses on its own creations: resume would
                                // be a trap. The gap is money the owner CHOSE
                                // not to expect.
                                ...(tpl.active
                                  ? {}
                                  : {
                                      consecutiveMisses: 0,
                                      nextDue: fastForwardPastGap(
                                        tpl,
                                        localToday(),
                                      ),
                                    }),
                              })
                            }
                          >
                            {tpl.active ? "Pause" : "Resume"}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-neutral-600 dark:text-red-400 dark:hover:bg-neutral-800"
                            onClick={() => setEndConfirmId(tpl.id)}
                          >
                            End
                          </button>
                        </div>
                      )}
                    </div>

                    {!ended &&
                      !tpl.active &&
                      tpl.consecutiveMisses >= RECURRING_PAUSE_AFTER_MISSES && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          {tpl.consecutiveMisses} missed — still active? Resume
                          if so, or leave it paused.
                        </p>
                      )}

                    {endConfirmId === tpl.id && !ended && (
                      <div className="mt-2 rounded-md bg-neutral-100 p-2.5 dark:bg-neutral-900">
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          End for good? It stops expecting this money — no
                          resume. Past sales stay in the history.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                            onClick={() => {
                              // active:false alongside endedOn so every
                              // active-only code path (indexes, filters)
                              // agrees this template is done.
                              onUpdateTemplate(tpl.id, {
                                active: false,
                                endedOn: localToday(),
                              });
                              setEndConfirmId(null);
                            }}
                          >
                            End it
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-600"
                            onClick={() => setEndConfirmId(null)}
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                        <ul className="space-y-2">
                          {draft.map(({ item, qtyText }, index) => (
                            <li
                              key={`${item.serviceId ?? "custom"}-${index}`}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {item.name || "Custom"}
                                <span className="ml-1 text-xs text-neutral-500">
                                  {formatCents(item.unitCents)} each
                                </span>
                              </span>
                              <input
                                aria-label={`Quantity of ${item.name || "custom line"}`}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="any"
                                className={`${narrowFieldClass} w-20 text-center`}
                                value={qtyText}
                                onChange={(e) =>
                                  setDraft((current) =>
                                    current.map((line, i) =>
                                      i === index
                                        ? { ...line, qtyText: e.target.value }
                                        : line,
                                    ),
                                  )
                                }
                              />
                              <button
                                type="button"
                                aria-label={`Remove ${item.name || "custom line"}`}
                                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-600"
                                onClick={() =>
                                  setDraft((current) =>
                                    current.filter((_, i) => i !== index),
                                  )
                                }
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>

                        {/* Adding from the catalog prices at TODAY's price —
                            that is the point of editing: future instances at
                            the new number. History keeps its snapshots. */}
                        {services.filter(
                          (svc) =>
                            !draft.some((d) => d.item.serviceId === svc.id),
                        ).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {services
                              .filter(
                                (svc) =>
                                  !draft.some(
                                    (d) => d.item.serviceId === svc.id,
                                  ),
                              )
                              .map((svc) => (
                                <button
                                  key={svc.id}
                                  type="button"
                                  className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                                  onClick={() =>
                                    setDraft((current) => [
                                      ...current,
                                      {
                                        item: lineFromService(svc, 1),
                                        qtyText: "1",
                                      },
                                    ])
                                  }
                                >
                                  + {svc.name}
                                </button>
                              ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            aria-label="Custom amount in dollars"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            className={`${narrowFieldClass} w-24`}
                            placeholder="0.00"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                          />
                          <input
                            aria-label="What the custom amount is for"
                            className={fieldClass}
                            placeholder="What for?"
                            value={customLabel}
                            onChange={(e) => setCustomLabel(e.target.value)}
                          />
                          <button
                            type="button"
                            disabled={dollarsToCents(customAmount) <= 0}
                            className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-neutral-600"
                            onClick={() => {
                              const cents = dollarsToCents(customAmount);
                              if (cents <= 0) return;
                              setDraft((current) => [
                                ...current,
                                {
                                  item: {
                                    serviceId: null,
                                    name: customLabel.trim() || "Custom",
                                    quantity: 1,
                                    unitCents: cents,
                                    unitCostCents: null,
                                  },
                                  qtyText: "1",
                                },
                              ]);
                              setCustomAmount("");
                              setCustomLabel("");
                            }}
                          >
                            Add
                          </button>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-neutral-500">
                            Future instances only — past sales keep what they
                            were charged.
                          </span>
                          <span className="text-sm font-semibold tabular-nums">
                            {built
                              ? formatCents(
                                  built.reduce(
                                    (sum, item) => sum + lineTotalCents(item),
                                    0,
                                  ),
                                )
                              : "—"}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={built === null}
                            className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
                            onClick={() => {
                              const lineItems = draftLines();
                              if (lineItems === null) return;
                              onUpdateTemplate(tpl.id, { lineItems });
                              closeTemplateEdit();
                            }}
                          >
                            Save changes
                          </button>
                          <button
                            type="button"
                            className="flex-1 rounded-lg border border-neutral-400 px-4 py-2.5 text-sm font-medium"
                            onClick={closeTemplateEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
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
                  // Ended is an answer, not a question — no amber nag.
                  t.endedOn === null &&
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
