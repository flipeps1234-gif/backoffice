"use client";

import { useState } from "react";
import type { Client } from "@/lib/client";
import { formatMiles, parseMilesToTenths } from "@/lib/mileage";
import {
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
import { useLocale } from "./use-locale";

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
  const qty = Number.parseFloat(text.replace(",", "."));
  return Number.isFinite(qty) && qty > 0 ? qty : null;
};

export default function ClientsPage({
  clients,
  sales,
  templates,
  services,
  initialOpenId,
  onUpdateClient,
  onUpdateTemplate,
  onLogAgain,
  onClose,
}: {
  clients: Client[];
  sales: Sale[];
  templates: RecurringTemplate[];
  services: Service[];
  /** Open straight on this client's detail — how search lands here. */
  initialOpenId?: string | null;
  onUpdateClient: (
    id: string,
    patch: Partial<Pick<Client, "name" | "notes" | "distanceTenths">>,
  ) => void;
  onUpdateTemplate: (id: string, patch: Partial<RecurringTemplate>) => void;
  onLogAgain: (sale: Sale) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  /** Round-trip miles as typed ("12.5"); parsed to tenths on save. */
  const [distance, setDistance] = useState("");

  // ---- template edit/end state (one template at a time) ----
  const [editTplId, setEditTplId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [customAmount, setCustomAmount] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [endConfirmId, setEndConfirmId] = useState<string | null>(null);
  /** Which history row's photo is expanded in place. */
  const [expandedPhotoSaleId, setExpandedPhotoSaleId] = useState<string | null>(
    null,
  );

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
            {t("clients.allClients")}
          </button>
          <button
            type="button"
            className="text-sm text-neutral-500 hover:underline"
            onClick={onClose}
          >
            {t("common.close")}
          </button>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="client-name">
                {t("clients.name")}
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
                {t("clients.notes")}
              </label>
              <textarea
                id="client-notes"
                className={fieldClass}
                rows={3}
                placeholder={t("clients.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="client-distance">
                {t("clients.distanceLabel")}
              </label>
              <input
                id="client-distance"
                type="text"
                inputMode="decimal"
                className={fieldClass}
                placeholder="12.5"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
              <p className="mt-1 text-xs text-neutral-500">
                {t("clients.distanceHint")}
              </p>
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
                    distanceTenths: parseMilesToTenths(distance),
                  });
                  setEditing(false);
                }}
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-neutral-400 px-4 py-3 text-sm font-medium"
                onClick={() => setEditing(false)}
              >
                {t("common.cancel")}
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
                setDistance(
                  detail.distanceTenths === null
                    ? ""
                    : formatMiles(detail.distanceTenths),
                );
                setEditing(true);
              }}
            >
              {t("common.edit")}
            </button>
          </div>
        )}

        {owed > 0 && (
          <p className="rounded-lg bg-neutral-100 px-4 py-3 text-sm dark:bg-neutral-900">
            {t("clients.owes")}{" "}
            <strong className="tabular-nums">{formatCents(owed)}</strong>
          </p>
        )}

        {theirTemplates.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium">
              {t("clients.recurring")}
            </h3>
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
                            t("clients.sale")}{" "}
                          · {formatCents(saleTotalCents(tpl))}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {tpl.cadence.type === "weekly"
                            ? t("sale.cadenceWeekly")
                            : tpl.cadence.type === "biweekly"
                              ? t("sale.cadenceBiweekly")
                              : tpl.cadence.type === "monthly"
                                ? t("sale.cadenceMonthly")
                                : t("clients.everyNDays", {
                                    days: tpl.cadence.days,
                                  })}
                          {ended
                            ? ` · ${t("clients.ended", { date: tpl.endedOn ?? "" })}`
                            : tpl.active
                              ? ` · ${t("clients.next", { date: tpl.nextDue })}`
                              : ` · ${t("clients.paused")}`}
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
                            {t("common.edit")}
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
                            {tpl.active
                              ? t("clients.pause")
                              : t("clients.resume")}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-neutral-600 dark:text-red-400 dark:hover:bg-neutral-800"
                            onClick={() => setEndConfirmId(tpl.id)}
                          >
                            {t("clients.end")}
                          </button>
                        </div>
                      )}
                    </div>

                    {!ended &&
                      !tpl.active &&
                      tpl.consecutiveMisses >= RECURRING_PAUSE_AFTER_MISSES && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          {t("clients.missedNag", {
                            count: tpl.consecutiveMisses,
                          })}
                        </p>
                      )}

                    {endConfirmId === tpl.id && !ended && (
                      <div className="mt-2 rounded-md bg-neutral-100 p-2.5 dark:bg-neutral-900">
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          {t("clients.endConfirm")}
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
                            {t("clients.endIt")}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-600"
                            onClick={() => setEndConfirmId(null)}
                          >
                            {t("clients.keep")}
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
                                {item.name || t("clients.custom")}
                                <span className="ml-1 text-xs text-neutral-500">
                                  {t("clients.each", {
                                    amount: formatCents(item.unitCents),
                                  })}
                                </span>
                              </span>
                              <input
                                aria-label={t("clients.quantityOf", {
                                  name: item.name || t("clients.customLine"),
                                })}
                                type="text"
                                inputMode="decimal"
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
                                aria-label={t("clients.removeItem", {
                                  name: item.name || t("clients.customLine"),
                                })}
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
                            aria-label={t("clients.customAmountAria")}
                            type="text"
                            inputMode="decimal"
                            className={`${narrowFieldClass} w-24`}
                            placeholder="0.00"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                          />
                          <input
                            aria-label={t("clients.customForAria")}
                            className={fieldClass}
                            placeholder={t("clients.whatFor")}
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
                            {t("common.add")}
                          </button>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-neutral-500">
                            {t("clients.futureOnly")}
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
                            {t("clients.saveChanges")}
                          </button>
                          <button
                            type="button"
                            className="flex-1 rounded-lg border border-neutral-400 px-4 py-2.5 text-sm font-medium"
                            onClick={closeTemplateEdit}
                          >
                            {t("common.cancel")}
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
          <h3 className="mb-2 text-sm font-medium">{t("clients.history")}</h3>
          {theirSales.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("clients.noSales")}</p>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
              {theirSales.map((sale) => (
                <li key={sale.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {sale.lineItems.map((i) => i.name).join(", ") ||
                          t("clients.sale")}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {sale.date} ·{" "}
                        {sale.state === "open"
                          ? t("clients.owesYou")
                          : sale.state === "expected"
                            ? t("clients.paidWaiting")
                            : sale.method === "cash"
                              ? t("clients.paidCash")
                              : t("clients.paid")}
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
                      {t("common.logAgain")}
                    </button>
                  </div>
                  {/* Proof-of-work, when the owner attached any. The photo
                      expands in place — no lightbox machinery. */}
                  {(sale.notes || sale.photo) && (
                    <div className="mt-1.5 flex items-start gap-2">
                      {sale.photo && (
                        // eslint-disable-next-line @next/next/no-img-element -- data URL, no loader
                        <img
                          src={sale.photo}
                          alt={t("clients.salePhotoAlt")}
                          className={
                            expandedPhotoSaleId === sale.id
                              ? "max-h-80 max-w-full cursor-zoom-out rounded-md object-contain"
                              : "h-10 w-10 shrink-0 cursor-zoom-in rounded-md object-cover"
                          }
                          onClick={() =>
                            setExpandedPhotoSaleId(
                              expandedPhotoSaleId === sale.id ? null : sale.id,
                            )
                          }
                        />
                      )}
                      {sale.notes && (
                        <p className="min-w-0 whitespace-pre-wrap text-xs text-neutral-500">
                          {sale.notes}
                        </p>
                      )}
                    </div>
                  )}
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
        <h2 className="text-sm font-semibold">{t("clients.title")}</h2>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:underline"
          onClick={onClose}
        >
          {t("common.close")}
        </button>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-neutral-500">{t("clients.empty")}</p>
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
                          {t("clients.recurringPaused")}
                        </span>
                      )}
                    </span>
                    {owed > 0 && (
                      <span className="text-sm tabular-nums text-neutral-500">
                        {t("clients.owesAmount", { amount: formatCents(owed) })}
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
