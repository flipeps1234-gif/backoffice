"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compressPhoto } from "./photo";
import ProductCard from "./product-card";
import { useLocale } from "./use-locale";
import { findClientByName, type Client } from "@/lib/client";
import {
  rankClientsForProducts,
  rankServicesForClient,
  usualServiceIds,
} from "@/lib/recommend";
import type { SaleFlowOrder } from "@/lib/settings";
import {
  MAX_EVERY_N_DAYS,
  advance,
  type Cadence,
  type RecurringTemplate,
} from "@/lib/recurring";
import {
  MAX_QUANTITY,
  lineFromService,
  saleTotalCents,
  type LineItem,
  type PaymentMethod,
  type Sale,
} from "@/lib/sale";
import { type Service } from "@/lib/service";
import { dollarsToCents, formatCents } from "@/lib/transaction";

/**
 * The sale flow — FLOW.md's left column: PICK PRODUCTS → CHECKOUT →
 * PAID? → cash/digital. The tree exists; the happy path collapses:
 * "log again" hands in a prefill and jumps straight to PAID?, so a
 * repeat sale is 2–3 taps.
 *
 * This screen never decides matching outcomes — it hands the finished
 * sale up through onDone and the parent runs the engine, because the
 * engine needs the ledger and the ledger lives up there.
 */

const labelClass = "mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400";
const fieldClass =
  "w-full rounded-md border border-neutral-500 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none";

/** Local calendar date — same rule as quick-add: toISOString would give
 *  tomorrow for an evening sale anywhere in the Americas. */
const today = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

export type SalePrefill = {
  lineItems: LineItem[];
  clientName: string;
};

export type SaleResult = {
  sale: Sale;
  /** Set when the user asked to save an unknown client — parent persists
   *  the client FIRST so the sale's clientId always references a row. */
  newClient: Client | null;
  /** Set when the recurring toggle was on. */
  template: Omit<RecurringTemplate, "id"> | null;
};

type Step = "client" | "pick" | "checkout" | "paid" | "method";

export default function NewSale({
  services,
  clients,
  sales,
  flowOrder,
  prefill,
  onDone,
  onClose,
  desktop = false,
}: {
  /** The sidebar app (/demooo): this form can stay mounted, hidden,
   *  while the owner works in other sections — see pickedClientId, the
   *  date and the quantity kinds below. Also picks the copy that names
   *  where products are added. */
  desktop?: boolean;
  services: Service[];
  clients: Client[];
  /** History — recommendations are DERIVED from it, never stored. */
  sales: Sale[];
  /** The settings-page choice: products→client or client→products. */
  flowOrder: SaleFlowOrder;
  /** "Log again": items + client pre-filled, jump straight to PAID?. */
  prefill?: SalePrefill;
  onDone: (result: SaleResult, paid: boolean, method: PaymentMethod | null) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [step, setStep] = useState<Step>(
    prefill ? "paid" : flowOrder === "client-first" ? "client" : "pick",
  );
  const [quantities, setQuantities] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const item of prefill?.lineItems ?? []) {
      if (item.serviceId) map.set(item.serviceId, item.quantity);
    }
    return map;
  });
  /**
   * Prefill lines are SNAPSHOTS of what was actually charged. Rebuilding
   * them from the current catalog silently re-priced a $75 job to catalog
   * price × 1 — wrong revenue written to the ledger and the tax CSV in two
   * taps. These overrides carry the historical unit price (and cost, and
   * name — the service may have been renamed or deleted) into the memo
   * below; the catalog only prices lines the user adds fresh.
   */
  const [prefillLines] = useState<Map<string, LineItem>>(() => {
    const map = new Map<string, LineItem>();
    for (const item of prefill?.lineItems ?? []) {
      if (item.serviceId) map.set(item.serviceId, item);
    }
    return map;
  });

  /**
   * What each catalog quantity MEANT when it was entered: "flat" (a
   * count) or "rate:sqft|hour|room" (a size). On the desktop app this
   * form can sit mounted while Products is edited in another section; a
   * service switched from $0.18/sq ft to a flat $200 would otherwise turn
   * "1200 sq ft" into 1200 × $200 = $240,000 on the PAID? screen. A line
   * whose kind no longer matches its service is dropped (the same rule
   * as a service that vanished: no invented price) and its stepper
   * starts again from zero.
   */
  const [kinds, setKinds] = useState<Map<string, string>>(() => new Map());
  const kindOf = (service: Service): string =>
    service.pricing.type === "rate" ? `rate:${service.pricing.unit}` : "flat";
  const kindChanged = (service: Service): boolean => {
    // Snapshot ("log again") lines never consult the catalog — the memo
    // below prices them from the snapshot whatever the service is now —
    // so the card must not show 0 for a line that is still being charged.
    if (prefillLines.has(service.id)) return false;
    const was = kinds.get(service.id);
    return was !== undefined && was !== kindOf(service);
  };
  const qtyOf = (service: Service): number =>
    kindChanged(service) ? 0 : (quantities.get(service.id) ?? 0);
  function setQty(service: Service, quantity: number) {
    backToProductsIfEmptied();
    setQuantities((current) => new Map(current).set(service.id, quantity));
    setKinds((current) => new Map(current).set(service.id, kindOf(service)));
    // A stepper tap replaces whatever was being typed in the size field.
    setSizeText((current) => {
      if (!current.has(service.id)) return current;
      const next = new Map(current);
      next.delete(service.id);
      return next;
    });
  }
  /**
   * The "how many hours / sq ft / rooms" field's TEXT while it is being
   * typed. The quantity is a number, and a text input bound to a number
   * cannot hold a half-typed one: "1." parses to 1, React writes "1" back
   * over the field, and the next key makes 15 — 1.5 hours became 15 hours
   * ($600 for a $60 lesson); clearing the "1" to type another size parsed
   * to 0 and unmounted the field under the keyboard (task-flow lens,
   * 2026-10-04). Same rule as the client page's qtyText and the keypad's
   * qty: keep what was typed, parse it on the side. An entry exists only
   * between the first keystroke and blur.
   */
  const [sizeText, setSizeText] = useState<Map<string, string>>(() => new Map());
  const typedSize = (service: Service): string | undefined =>
    kindChanged(service) ? undefined : sizeText.get(service.id);
  function typeSize(service: Service, text: string) {
    const size = Number.parseFloat(text.replace(",", "."));
    setQty(service, Number.isFinite(size) && size > 0 && size <= MAX_QUANTITY ? size : 0);
    // After setQty: its updater drops the entry, this one puts the new text back.
    setSizeText((current) => new Map(current).set(service.id, text));
  }
  function doneTypingSize(service: Service) {
    setSizeText((current) => {
      if (!current.has(service.id)) return current;
      const next = new Map(current);
      next.delete(service.id);
      return next;
    });
  }
  // Custom amount: a sale with no catalog product behind it. Kept as
  // dollars text until checkout so typing feels like the numpad.
  const [customAmount, setCustomAmount] = useState(() => {
    const custom = prefill?.lineItems.find((i) => i.serviceId === null);
    return custom ? (custom.unitCents / 100).toFixed(2) : "";
  });
  const [customLabel, setCustomLabel] = useState(
    () => prefill?.lineItems.find((i) => i.serviceId === null)?.name ?? "",
  );

  const [clientName, setClientName] = useState(prefill?.clientName ?? "");
  /**
   * WHO, by id, once the name resolves to an existing client. A name is
   * not an identity: on the desktop app the client can be renamed in the
   * Clients section while this form waits, and re-resolving "Ana" after
   * she became "Ana Souza" found nobody — so finish() minted a second
   * "Ana" and hung the sale (and any recurring template) off it, with no
   * merge to undo it. The id survives the rename; typing a different
   * name re-resolves.
   */
  const [pickedClientId, setPickedClientId] = useState<string | null>(
    () => findClientByName(clients, prefill?.clientName ?? "")?.id ?? null,
  );
  function chooseClientName(name: string) {
    setClientName(name);
    setPickedClientId(findClientByName(clients, name)?.id ?? null);
  }
  /**
   * null = "follow the clock". The date used to be copied from the clock
   * at mount; a form parked behind the sidebar for a day then logged the
   * sale (and its cash payment, and a recurring anchor) on the day it was
   * OPENED. Only a date the owner picks is remembered; "" (a cleared
   * field) still means today at finish, as before.
   */
  const [dateOverride, setDate] = useState<string | null>(null);
  const date = dateOverride ?? today();
  const [recurring, setRecurring] = useState(false);
  const [cadence, setCadence] = useState<Cadence>({ type: "weekly" });
  const [everyN, setEveryN] = useState("30");
  const [saveClient, setSaveClient] = useState(true);
  // Proof-of-work, v0.6 — both optional, both decoration on the money.
  const [showProof, setShowProof] = useState(false);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  async function attachPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(false);
    try {
      setPhoto(await compressPhoto(file));
    } catch {
      // A bad photo must never block the sale — the money is the record,
      // the picture is decoration.
      setPhotoError(true);
    } finally {
      setPhotoBusy(false);
    }
  }

  const lineItems = useMemo((): LineItem[] => {
    const items: LineItem[] = [];
    for (const [serviceId, qty] of quantities) {
      if (qty <= 0) continue;
      const snapshot = prefillLines.get(serviceId);
      if (snapshot) {
        // The historical price, at whatever quantity the user now says.
        items.push({ ...snapshot, quantity: qty });
        continue;
      }
      const service = services.find((svc) => svc.id === serviceId);
      const was = kinds.get(serviceId);
      const sameKind =
        service !== undefined &&
        (was === undefined ||
          was === (service.pricing.type === "rate" ? `rate:${service.pricing.unit}` : "flat"));
      if (service && sameKind) items.push(lineFromService(service, qty));
      // No snapshot and no catalog entry: nothing to price it with — the
      // qty map can only contain such an id if the catalog changed mid-
      // sale, and a silently-invented price would be worse than dropping.
    }
    const customCents = dollarsToCents(customAmount);
    if (customCents > 0) {
      items.push({
        serviceId: null,
        name: customLabel.trim() || "Custom",
        quantity: 1,
        unitCents: customCents,
        unitCostCents: null,
      });
    }
    return items;
  }, [services, quantities, kinds, prefillLines, customAmount, customLabel]);

  const totalCents = saleTotalCents({ lineItems });
  /**
   * Nothing left to sell on a step past the products screen: only a line
   * dropped behind the form (see `kinds`) gets here — the Checkout button
   * is the one way forward and it is disabled at $0. Show the products
   * screen instead of a $0.00 "Paid?" that would log an empty sale; the
   * first thing added there makes the step real (backToProductsIfEmptied),
   * so the form does not jump back to "Paid?" by itself.
   */
  const emptied =
    totalCents === 0 && (step === "checkout" || step === "paid" || step === "method");
  const shownStep: Step = emptied ? "pick" : step;
  function backToProductsIfEmptied() {
    if (emptied) setStep("pick");
  }
  // Focus follows the step (as in the setup wizard): the button that moved
  // the flow on has just unmounted, so the new step's heading takes focus
  // instead of <body>, and a screen reader hears where it landed. On mount
  // too — Start sale and Log again unmount the button that opened the flow.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [shownStep]);
  const knownClient =
    clients.find((c) => c.id === pickedClientId) ?? findClientByName(clients, clientName);
  const unknownName = clientName.trim() !== "" && !knownClient;

  function step_(service: Service, delta: 1 | -1) {
    // qtyOf, not the raw map: a quantity whose kind went stale counts as 0.
    setQty(service, Math.max(0, qtyOf(service) + delta));
  }

  /** Assemble the SaleResult once; every terminal button routes through. */
  function finish(paid: boolean, method: PaymentMethod | null) {
    // The native date input is clearable (select-and-delete, Android's
    // Clear) and nothing stops checkout with it empty — but the sales
    // table's occurred_on is NOT NULL (0006), so a "" date is a sale that
    // never persists, and advance("") throws before onDone ever runs.
    // An empty date means "today", same default the field started with.
    // Read the clock NOW (not at the last render) unless the owner chose.
    const when = (dateOverride ?? today()) || today();
    const trimmed = clientName.trim();
    const client =
      knownClient ??
      (trimmed && saveClient
        ? { id: crypto.randomUUID(), name: trimmed, notes: "", distanceTenths: null }
        : null);

    const sale: Sale = {
      id: crypto.randomUUID(),
      clientId: client?.id ?? null,
      lineItems,
      date: when,
      state: paid ? (method === "cash" ? "paid" : "expected") : "open",
      method: paid ? method : null,
      matchedTxnId: null,
      recurringTemplateId: null,
      notes: notes.trim(),
      photo,
    };

    const template =
      recurring && client
        ? {
            clientId: client.id,
            lineItems: lineItems.map((i) => ({ ...i })),
            cadence:
              cadence.type === "everyN"
                ? {
                    type: "everyN" as const,
                    days: Math.min(MAX_EVERY_N_DAYS, Math.max(1, Math.round(Number(everyN) || 30))),
                  }
                : cadence,
            // Anchored on THIS sale's date, due one cadence step LATER:
            // this sale itself covers the anchor date, and a nextDue of
            // today would generate a duplicate instance immediately.
            nextDue: advance(
              when,
              cadence.type === "everyN"
                ? { type: "everyN", days: Math.min(MAX_EVERY_N_DAYS, Math.max(1, Math.round(Number(everyN) || 30))) }
                : cadence,
            ),
            active: true,
            consecutiveMisses: 0,
            endedOn: null,
          }
        : null;

    onDone(
      { sale, newClient: knownClient ? null : client, template },
      paid,
      method,
    );
  }

  const header = (title: string) => (
    <div className="flex items-baseline justify-between">
      <h2 ref={headingRef} tabIndex={-1} className="text-sm font-semibold focus:outline-none">
        {title}
      </h2>
      <button
        type="button"
        className="-mx-2 min-h-11 px-2 text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
        onClick={onClose}
      >
        {t("common.close")}
      </button>
    </div>
  );

  // ---- PAID? — one question, huge targets ----
  if (shownStep === "paid") {
    return (
      <div className="space-y-6">
        {header(t("sale.title"))}
        <p className="text-center text-4xl font-semibold tabular-nums">
          {formatCents(totalCents)}
        </p>
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          {(knownClient?.name ?? clientName.trim()) || t("sale.noClient")} ·{" "}
          {lineItems.map((i) => i.name).join(", ") || t("sale.noItems")}
        </p>
        <h3 className="text-center text-lg font-semibold">
          {t("sale.paidQuestion")}
        </h3>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl bg-emerald-700 px-4 py-6 text-lg font-semibold text-white hover:bg-emerald-800"
            onClick={() => setStep("method")}
          >
            {t("common.yes")}
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border border-neutral-400 px-4 py-6 text-lg font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900"
            onClick={() => finish(false, null)}
          >
            {t("sale.noOwesMe")}
          </button>
        </div>
        <button
          type="button"
          className="min-h-11 w-full text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
          onClick={() => setStep("checkout")}
        >
          {t("sale.backToDetails")}
        </button>
      </div>
    );
  }

  // ---- CASH OR DIGITAL? ----
  if (shownStep === "method") {
    return (
      <div className="space-y-6">
        {header(t("sale.title"))}
        <p className="text-center text-4xl font-semibold tabular-nums">
          {formatCents(totalCents)}
        </p>
        <h3 className="text-center text-lg font-semibold">
          {t("sale.cashOrDigital")}
        </h3>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl bg-emerald-700 px-4 py-6 text-lg font-semibold text-white hover:bg-emerald-800"
            onClick={() => finish(true, "cash")}
          >
            {t("sale.cash")}
          </button>
          <button
            type="button"
            disabled={!clientName.trim()}
            className="flex-1 rounded-xl bg-foreground px-4 py-6 text-lg font-semibold text-background hover:opacity-90 disabled:opacity-40"
            onClick={() => finish(true, "digital")}
          >
            {t("sale.digital")}
          </button>
        </div>
        {!clientName.trim() && (
          <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
            {t("sale.digitalNeedsClient")}
          </p>
        )}
        <button
          type="button"
          className="min-h-11 w-full text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
          onClick={() => setStep("paid")}
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  // ---- CHECKOUT ----
  if (shownStep === "checkout") {
    return (
      <div className="space-y-4">
        {header(t("sale.checkout"))}
        <p className="text-center text-4xl font-semibold tabular-nums">
          {formatCents(totalCents)}
        </p>

        <div>
          <label className={labelClass} htmlFor="sale-client">
            {t("sale.whoFor")}
          </label>
          {/* Products-first order: who usually buys THESE? Chips ranked
              from history — a suggestion, never a guess written down. */}
          {flowOrder === "products-first" &&
            (() => {
              const picked = lineItems
                .map((i) => i.serviceId)
                .filter((id): id is string => id !== null);
              const suggested = rankClientsForProducts(clients, sales, picked);
              if (suggested.length === 0) return null;
              return (
                <div
                  className="mb-2 flex flex-wrap gap-2"
                  role="group"
                  aria-label={t("sale.recentClients")}
                >
                  {suggested.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={knownClient?.id === c.id}
                      className={`min-h-10 rounded-full px-3 text-sm font-medium ${
                        knownClient?.id === c.id
                          ? "bg-foreground text-background"
                          : "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      }`}
                      onClick={() => chooseClientName(c.name)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              );
            })()}
          <input
            id="sale-client"
            className={fieldClass}
            placeholder={t("sale.clientNamePlaceholder")}
            list="known-clients"
            value={clientName}
            onChange={(e) => chooseClientName(e.target.value)}
          />
          <datalist id="known-clients">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          {unknownName && (
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={saveClient}
                onChange={(e) => setSaveClient(e.target.checked)}
              />
              {t("sale.saveAsClient", { name: clientName.trim() })}
            </label>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="sale-date">
            {t("sale.date")}
          </label>
          <input
            id="sale-date"
            type="date"
            // iOS date inputs size to their own content without these
            // (see confirmation-sheet.tsx — same overflow, same fix).
            className={`${fieldClass} min-w-0 appearance-none`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Proof-of-work — FLOW.md's `photo/notes (opt.)`. Collapsed by
            default: the ten-second driveway sale never sees it. */}
        <div className="rounded-lg border border-neutral-300 p-3 dark:border-neutral-700">
          {!showProof && !notes && !photo ? (
            <button
              type="button"
              className="-mx-2 min-h-11 px-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:underline"
              onClick={() => setShowProof(true)}
            >
              {t("sale.addProof")}
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={labelClass} htmlFor="sale-notes">
                  {t("sale.noteLabel")}
                </label>
                <textarea
                  id="sale-notes"
                  maxLength={8000}
                  className={fieldClass}
                  rows={2}
                  placeholder={t("sale.notePlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div>
                {photo ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL, no loader */}
                    <img
                      src={photo}
                      alt={t("sale.photoAlt")}
                      className="h-14 w-14 rounded-md object-cover"
                    />
                    <button
                      type="button"
                      className="-mx-2 min-h-11 px-2 text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
                      onClick={() => setPhoto(null)}
                    >
                      {t("sale.photoRemove")}
                    </button>
                  </div>
                ) : (
                  // sr-only, not hidden: a display:none input is out of the
                  // tab order, so "Add a photo" was unreachable by keyboard.
                  // The label shows the focus the input holds.
                  <label className="inline-block cursor-pointer rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium ring-neutral-900 hover:bg-neutral-50 has-[:focus-visible]:ring-2 dark:border-neutral-600 dark:ring-neutral-100 dark:hover:bg-neutral-800">
                    {photoBusy ? t("sale.photoReading") : t("sale.photoAdd")}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={photoBusy}
                      onChange={(e) => {
                        void attachPhoto(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
                {photoError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {t("sale.photoError")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-neutral-300 p-3 dark:border-neutral-700">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={recurring}
              disabled={!clientName.trim()}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            {t("sale.makeRecurring")}
            {!clientName.trim() && (
              <span className="font-normal text-neutral-600 dark:text-neutral-400">
                {t("sale.needsClient")}
              </span>
            )}
          </label>
          {recurring && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { type: "weekly" },
                    { type: "biweekly" },
                    { type: "monthly" },
                    { type: "everyN", days: 30 },
                  ] as Cadence[]
                ).map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    aria-pressed={cadence.type === option.type}
                    className={`rounded-lg px-2 py-2 text-sm font-medium ${
                      cadence.type === option.type
                        ? "bg-foreground text-background"
                        : "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    }`}
                    onClick={() => setCadence(option)}
                  >
                    {option.type === "everyN"
                      ? t("sale.cadenceEveryN")
                      : option.type === "weekly"
                        ? t("sale.cadenceWeekly")
                        : option.type === "biweekly"
                          ? t("sale.cadenceBiweekly")
                          : t("sale.cadenceMonthly")}
                  </button>
                ))}
              </div>
              {cadence.type === "everyN" && (
                <div className="flex items-center gap-2 text-sm">
                  <label htmlFor="sale-everyn">{t("sale.every")}</label>
                  <input
                    id="sale-everyn"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={MAX_EVERY_N_DAYS}
                    className={`${fieldClass} w-20 text-center`}
                    value={everyN}
                    onChange={(e) => setEveryN(e.target.value)}
                  />
                  {/* Same fallback finish() applies — a cleared date field
                      must not render a blank anchor in the summary. */}
                  <span>{t("sale.daysStarting", { date: date || today() })}</span>
                </div>
              )}
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {t("sale.recurringNote")}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          // While a photo is still compressing, leaving checkout would let
          // the sale finish with photo=null and silently drop it — hold
          // here for the half-second; the label above says why.
          disabled={photoBusy}
          className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
          onClick={() => setStep("paid")}
        >
          {t("common.continue")}
        </button>
        <button
          type="button"
          className="min-h-11 w-full text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
          onClick={() => setStep("pick")}
        >
          {t("sale.backToProducts")}
        </button>
      </div>
    );
  }

  // ---- WHO'S IT FOR? — first ONLY in the client-first order ----
  if (shownStep === "client") {
    const recent = rankClientsForProducts(clients, sales, []);
    return (
      <div className="space-y-4">
        {header(t("sale.title"))}

        <div>
          <label className={labelClass} htmlFor="sale-client-first">
            {t("sale.whoFor")}
          </label>
          <input
            id="sale-client-first"
            className={fieldClass}
            placeholder={t("sale.clientNamePlaceholder")}
            list="known-clients"
            value={clientName}
            onChange={(e) => chooseClientName(e.target.value)}
          />
          <datalist id="known-clients">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>

        {recent.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t("sale.recentClients")}
          >
            {recent.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={knownClient?.id === c.id}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  knownClient?.id === c.id
                    ? "bg-foreground text-background"
                    : "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                }`}
                onClick={() => chooseClientName(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90"
          onClick={() => setStep("pick")}
        >
          {t("common.continue")}
        </button>
        {/* A nameless sale is still a sale — the driveway wins. */}
        {!clientName.trim() && (
          <button
            type="button"
            className="min-h-11 w-full text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
            onClick={() => setStep("pick")}
          >
            {t("sale.skipForNow")}
          </button>
        )}
      </div>
    );
  }

  // ---- PICK PRODUCTS ----
  return (
    <div className="space-y-4">
      {header(t("sale.title"))}

      {services.length === 0 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t(desktop ? "desktop.noProducts" : "sale.noProducts")}
        </p>
      )}

      <div className="space-y-3">
        {(() => {
          const renderService = (service: Service) => (
            <div key={service.id} className="space-y-2">
              <ProductCard
                service={service}
                quantity={qtyOf(service)}
                onStep={(delta) => step_(service, delta)}
              />
              {/* Also while its text is being typed: an empty or "0." field
                  is a quantity of 0 for a moment, and must stay put. */}
              {service.pricing.type === "rate" &&
                (qtyOf(service) > 0 || typedSize(service) !== undefined) && (
                  <div className="flex items-center gap-2 px-2 text-sm">
                    <label htmlFor={`size-${service.id}`}>
                      {t(
                        service.pricing.unit === "sqft"
                          ? "sale.howManySqft"
                          : service.pricing.unit === "hour"
                            ? "sale.howManyHours"
                            : "sale.howManyRooms",
                      )}
                    </label>
                    <input
                      id={`size-${service.id}`}
                      type="text"
                      inputMode="decimal"
                      className={`${fieldClass} w-24 text-center`}
                      value={typedSize(service) ?? String(qtyOf(service))}
                      onChange={(e) => typeSize(service, e.target.value)}
                      // Leaving the field shows the number that will be
                      // charged ("1," → 1); left empty, the line is off.
                      onBlur={() => doneTypingSize(service)}
                    />
                  </div>
                )}
            </div>
          );

          // Client-first: THEIR services float up under a heading —
          // derived from history at this moment, never stored, and a
          // ranking, not a filter (everything stays one scroll away).
          const clientFirst = flowOrder === "client-first" && knownClient;
          const ordered = clientFirst
            ? rankServicesForClient(services, sales, knownClient.id)
            : services;
          const usualIds = clientFirst
            ? usualServiceIds(sales, knownClient.id)
            : null;
          const usual = usualIds
            ? ordered.filter((s) => usualIds.has(s.id))
            : [];
          const rest = usualIds
            ? ordered.filter((s) => !usualIds.has(s.id))
            : ordered;

          const heading = (text: string) => (
            <p
              key={text}
              className="pt-1 text-xs font-medium uppercase tracking-wide text-neutral-600 dark:text-neutral-400"
            >
              {text}
            </p>
          );

          return (
            <>
              {usual.length > 0 &&
                heading(t("sale.theirUsual", { name: knownClient!.name }))}
              {usual.map(renderService)}
              {usual.length > 0 && rest.length > 0 &&
                heading(t("sale.everythingElse"))}
              {rest.map(renderService)}
            </>
          );
        })()}
        {[...prefillLines.values()]
          .filter((item) => !services.some((svc) => svc.id === item.serviceId))
          .map((item) => (
            // The service was deleted/renamed since this sale — the line
            // still shows and still charges its snapshot price.
            <div
              key={item.serviceId}
              className="rounded-xl border border-neutral-300 p-4 text-sm dark:border-neutral-700"
            >
              {item.name} · {formatCents(item.unitCents)} ·{" "}
              {quantities.get(item.serviceId!) ?? 0} —{" "}
              {t("sale.fromOriginalSale")}
            </div>
          ))}
      </div>

      <div className="rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
        <p className="mb-2 text-sm font-semibold">{t("sale.customAmount")}</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            aria-label={t("sale.customAmountAria")}
            type="text"
            inputMode="decimal"
            className={fieldClass}
            placeholder="0.00"
            value={customAmount}
            onChange={(e) => {
              backToProductsIfEmptied();
              setCustomAmount(e.target.value);
            }}
          />
          <input
            aria-label={t("sale.customLabelAria")}
            className={fieldClass}
            placeholder={t("sale.customLabelPlaceholder")}
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-4 py-3 dark:bg-neutral-900">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">{t("common.total")}</span>
        <span className="text-2xl font-semibold tabular-nums">
          {formatCents(totalCents)}
        </span>
      </div>

      <button
        type="button"
        disabled={totalCents === 0}
        className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
        onClick={() => setStep("checkout")}
      >
        {t("sale.checkout")}
      </button>
      {flowOrder === "client-first" && !prefill && (
        <button
          type="button"
          className="min-h-11 w-full text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
          onClick={() => setStep("client")}
        >
          {t("sale.backToClient")}
        </button>
      )}
    </div>
  );
}
