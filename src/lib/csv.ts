import type { Service } from "./service";
import type { Transaction } from "./transaction";

/**
 * Two exports, on purpose.
 *
 * taxCsv is "give this to your tax preparer": business rows only, ACTUAL
 * logged amounts, oldest first. The catalog's cost ESTIMATES never appear
 * here, because an estimate on a tax document is a lie.
 *
 * everythingCsv is the user getting their own data out — every row, whatever
 * it is, including personal and not-yet-sorted ones. CLAUDE.md's permanent
 * boundary is "never gate viewing or exporting a user's own data", and a
 * business-only export is a gate on the rest of it.
 */

/**
 * RFC-4180 quoting, plus formula neutralization. Payer and memo text comes
 * from screenshots — anyone who pays the owner controls it, and Excel
 * executes a cell starting with = + - or @ as a formula even when quoted.
 * The standard mitigation is a leading apostrophe.
 */
const field = (value: string): string => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const dollars = (cents: number): string => (cents / 100).toFixed(2);

/** Oldest first — accountants and spreadsheets both read chronologically. */
const chronological = (rows: Transaction[]): Transaction[] =>
  [...rows].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));

const serviceName = (tx: Transaction, services: Service[]): string =>
  tx.serviceId
    ? (services.find((s) => s.id === tx.serviceId)?.name ?? "")
    : "";

/** Expenses are negative in the amount column — so the column sums correctly. */
const signedAmount = (tx: Transaction): string =>
  (tx.direction === "out" ? "-" : "") + dollars(tx.amountCents);

/**
 * The BOM is what makes Excel decode UTF-8 — without it, "José" opens as
 * "JosÃ©" on the accountant's machine. Other tools ignore it.
 */
const document_ = (lines: string[]): string =>
  "﻿" + lines.join("\r\n") + "\r\n";

export const taxCsv = (
  transactions: Transaction[],
  services: Service[],
): string => {
  const lines = [["date", "type", "who", "service", "note", "amount"].join(",")];

  for (const tx of chronological(transactions.filter((tx) => tx.business === true))) {
    lines.push(
      [
        field(tx.date || "unknown"),
        tx.direction === "out" ? "expense" : "income",
        field(tx.payer),
        field(serviceName(tx, services)),
        field(tx.memo),
        signedAmount(tx),
      ].join(","),
    );
  }

  return document_(lines);
};

/**
 * Everything, with nothing filtered out. The extra `kind` column is what makes
 * that safe to hand around: a row marked personal or unsorted cannot be
 * mistaken for business income by whoever opens the file.
 */
export const everythingCsv = (
  transactions: Transaction[],
  services: Service[],
): string => {
  const lines = [
    ["date", "kind", "type", "who", "service", "note", "amount", "source"].join(
      ",",
    ),
  ];

  for (const tx of chronological(transactions)) {
    lines.push(
      [
        field(tx.date || "unknown"),
        tx.business === true
          ? "business"
          : tx.business === false
            ? "personal"
            : "unsorted",
        tx.direction === "out" ? "expense" : "income",
        field(tx.payer),
        field(serviceName(tx, services)),
        field(tx.memo),
        signedAmount(tx),
        tx.source,
      ].join(","),
    );
  }

  return document_(lines);
};
