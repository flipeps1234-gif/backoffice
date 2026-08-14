import { scheduleCLabel } from "./category";
import type { Client } from "./client";
import { formatMiles, type MileageEntry } from "./mileage";
import { hasProfile, type BusinessProfile } from "./profile";
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
  profile?: BusinessProfile,
): string => {
  const lines: string[] = [];

  // Business header (v0.6.7) — who this ledger belongs to, on top,
  // where the preparer looks first. Only the fields the owner filled;
  // a blank profile emits nothing and the file is byte-identical to
  // the pre-profile format.
  if (profile && hasProfile(profile)) {
    if (profile.businessName) lines.push(`business,${field(profile.businessName)}`);
    if (profile.ownerName) lines.push(`owner,${field(profile.ownerName)}`);
    if (profile.usState) lines.push(`state,${field(profile.usState)}`);
    lines.push("");
  }

  // `category` (v0.6.5) is the Schedule C line the owner tagged the
  // expense with — pre-sorted for the preparer, blank when untagged or
  // for income. A label, never tax logic.
  lines.push(
    ["date", "type", "who", "service", "note", "category", "amount"].join(","),
  );

  for (const tx of chronological(transactions.filter((tx) => tx.business === true))) {
    lines.push(
      [
        field(tx.date || "unknown"),
        tx.direction === "out" ? "expense" : "income",
        field(tx.payer),
        field(serviceName(tx, services)),
        field(tx.memo),
        field(tx.direction === "out" ? scheduleCLabel(tx.category) : ""),
        signedAmount(tx),
      ].join(","),
    );
  }

  return document_(lines);
};

/**
 * The computed mileage log — v0.6.5. One row per logged visit to a
 * client whose round-trip distance is on file. An ESTIMATE built from
 * two facts the owner typed (distance) and logged (the visit); says so
 * in the header so nobody mistakes it for an odometer.
 */
export const mileageCsv = (
  entries: MileageEntry[],
  clients: Client[],
): string => {
  const name = (id: string): string =>
    clients.find((c) => c.id === id)?.name ?? "";
  const lines = [["date", "client", "round_trip_miles"].join(",")];
  let totalTenths = 0;
  for (const entry of entries) {
    totalTenths += entry.tenths;
    lines.push(
      [
        field(entry.date),
        field(name(entry.clientId)),
        formatMiles(entry.tenths),
      ].join(","),
    );
  }
  lines.push(["total", "", formatMiles(totalTenths)].join(","));
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
    [
      "date",
      "kind",
      "type",
      "who",
      "service",
      "note",
      "category",
      "amount",
      "source",
    ].join(","),
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
        field(tx.direction === "out" ? scheduleCLabel(tx.category) : ""),
        signedAmount(tx),
        tx.source,
      ].join(","),
    );
  }

  return document_(lines);
};
