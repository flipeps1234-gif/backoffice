import type { Service } from "./service";
import type { Transaction } from "./transaction";

/**
 * "Give this to your tax preparer." ACTUAL logged rows only — business
 * income and business expenses as they happened. The catalog's cost
 * ESTIMATES never appear here; an estimate on a tax document is a lie.
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

export const taxCsv = (
  transactions: Transaction[],
  services: Service[],
): string => {
  const rows = transactions
    .filter((tx) => tx.business === true)
    // Oldest first — accountants read chronologically.
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));

  const lines = [
    ["date", "type", "who", "service", "note", "amount"].join(","),
  ];

  for (const tx of rows) {
    const service = tx.serviceId
      ? (services.find((s) => s.id === tx.serviceId)?.name ?? "")
      : "";
    lines.push(
      [
        field(tx.date || "unknown"),
        tx.direction === "out" ? "expense" : "income",
        field(tx.payer),
        field(service),
        field(tx.memo),
        // Expenses are negative in the amount column — accountants sum it.
        (tx.direction === "out" ? "-" : "") + dollars(tx.amountCents),
      ].join(","),
    );
  }

  // The BOM is what makes Excel decode UTF-8 — without it, "José" opens as
  // "JosÃ©" on the accountant's machine. Other tools ignore it.
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
};
