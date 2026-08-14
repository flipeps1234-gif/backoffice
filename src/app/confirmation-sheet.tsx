"use client";

import {
  centsToDollars,
  dollarsToCents,
  formatCents,
  isUncertain,
  totalsByDirection,
  uncertainFields,
  type Transaction,
} from "@/lib/transaction";
import { useLocale } from "./use-locale";
import { CATEGORIES, isCategoryId } from "@/lib/category";

/**
 * The pre-filled sheet. Every row is already correct as far as we know — the
 * user only touches what we flagged. Flagged fields carry an amber ring.
 */

const labelClass = "block text-xs font-medium text-neutral-500 mb-1";

const inputClass = (flagged: boolean) =>
  [
    "w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900",
    "placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900",
    flagged ? "border-amber-500 ring-2 ring-amber-200" : "border-neutral-300",
  ].join(" ");

export default function ConfirmationSheet({
  transactions,
  onChange,
}: {
  transactions: Transaction[];
  onChange: (id: string, patch: Partial<Transaction>) => void;
}) {
  const { t } = useLocale();
  const flaggedCount = transactions.filter(
    (tx) => uncertainFields(tx).length > 0,
  ).length;
  const { inCents, outCents } = totalsByDirection(transactions);
  const payments = transactions.filter((tx) => tx.direction !== "out").length;
  const expenses = transactions.length - payments;

  const found = [
    payments > 0
      ? payments === 1
        ? t("sheet.paymentCount.one")
        : t("sheet.paymentCount.many", { count: payments })
      : "",
    expenses > 0
      ? expenses === 1
        ? t("sheet.expenseCount.one")
        : t("sheet.expenseCount.many", { count: expenses })
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold">
          {t("sheet.found", { list: found })}
        </h2>
        <p className="text-sm tabular-nums font-semibold">
          {formatCents(inCents)}
          {outCents > 0 && (
            <span className="text-red-500"> −{formatCents(outCents)}</span>
          )}
        </p>
      </header>

      {flaggedCount > 0 && (
        <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
          {flaggedCount === 1
            ? t("sheet.needsLook.one")
            : t("sheet.needsLook.many", { count: flaggedCount })}{" "}
          {t("sheet.needsLookTail")}
        </p>
      )}

      <ul className="space-y-3">
        {transactions.map((tx) => (
          <li
            key={tx.id}
            className="rounded-lg border border-neutral-200 bg-white p-3 space-y-3"
          >
            {/* Direction is extracted too, and it's the one field that flips
                the SIGN of the money — so it must be as fixable as a typo'd
                amount. Tap to flip. */}
            <button
              type="button"
              aria-pressed={tx.direction === "out"}
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                tx.direction === "out"
                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}
              onClick={() =>
                onChange(tx.id, {
                  direction: tx.direction === "out" ? "in" : "out",
                })
              }
            >
              {tx.direction === "out"
                ? t("sheet.moneyOut")
                : t("sheet.moneyIn")}{" "}
              {t("sheet.tapToFlip")}
            </button>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelClass} htmlFor={`${tx.id}-payer`}>
                  {tx.direction === "out"
                    ? t("sheet.paidTo")
                    : t("sheet.whoPaid")}
                </label>
                <input
                  id={`${tx.id}-payer`}
                  className={inputClass(isUncertain(tx, "payer"))}
                  value={tx.payer}
                  placeholder={t("sheet.namePlaceholder")}
                  onChange={(event) =>
                    onChange(tx.id, { payer: event.target.value })
                  }
                />
              </div>
              <div className="w-28">
                <label className={labelClass} htmlFor={`${tx.id}-amount`}>
                  {t("sheet.amount")}
                </label>
                <input
                  id={`${tx.id}-amount`}
                  type="text"
                  inputMode="decimal"
                  className={inputClass(isUncertain(tx, "amountCents"))}
                  defaultValue={centsToDollars(tx.amountCents)}
                  onChange={(event) =>
                    onChange(tx.id, {
                      amountCents: dollarsToCents(event.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="w-40">
                <label className={labelClass} htmlFor={`${tx.id}-date`}>
                  {t("sheet.date")}
                </label>
                <input
                  id={`${tx.id}-date`}
                  type="date"
                  className={inputClass(isUncertain(tx, "date"))}
                  value={tx.date}
                  onChange={(event) =>
                    onChange(tx.id, { date: event.target.value })
                  }
                />
              </div>
              <div className="flex-1">
                <label className={labelClass} htmlFor={`${tx.id}-memo`}>
                  {t("sheet.note")}
                </label>
                <input
                  id={`${tx.id}-memo`}
                  className={inputClass(false)}
                  value={tx.memo}
                  placeholder={t("sheet.optionalPlaceholder")}
                  onChange={(event) =>
                    onChange(tx.id, { memo: event.target.value })
                  }
                />
              </div>
            </div>

            {/* Receipts get a Schedule-C-grade label here, at confirm time
                — optional, and the tax CSV inherits it. Income rows never
                show this: categories are an expense concept. */}
            {tx.direction === "out" && (
              <div>
                <label className={labelClass} htmlFor={`${tx.id}-category`}>
                  {t("cats.pickerLabel")}
                </label>
                <select
                  id={`${tx.id}-category`}
                  className={inputClass(false)}
                  value={isCategoryId(tx.category) ? tx.category : ""}
                  onChange={(event) =>
                    onChange(tx.id, {
                      category: event.target.value === "" ? null : event.target.value,
                    })
                  }
                >
                  <option value="">{t("cats.none")}</option>
                  {CATEGORIES.map(({ id }) => (
                    <option key={id} value={id}>
                      {t(`cats.${id}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
