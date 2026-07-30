"use client";

import { useState } from "react";
import ConfirmationSheet from "./confirmation-sheet";
import { warningMessage, type ExtractionWarning } from "@/lib/extract/types";
import type { Transaction } from "@/lib/transaction";

type Status = "idle" | "reading" | "done" | "error";

export default function UploadScreen() {
  const [status, setStatus] = useState<Status>("idle");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [warnings, setWarnings] = useState<ExtractionWarning[]>([]);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setStatus("reading");
    setError("");

    const body = new FormData();
    for (const file of files) body.append("screenshots", file);

    try {
      const response = await fetch("/api/extract", { method: "POST", body });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong reading those.");
        setStatus("error");
        return;
      }
      setTransactions(data.transactions);
      setWarnings(data.warnings);
      setStatus("done");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  // Replace one row, leave the rest untouched.
  function updateTransaction(id: string, patch: Partial<Transaction>) {
    setTransactions((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)),
    );
  }

  return (
    <div className="space-y-6">
      <label className="block cursor-pointer rounded-lg border-2 border-dashed border-neutral-300 px-6 py-10 text-center hover:border-neutral-500">
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <span className="block text-base font-medium">
          Add screenshots of your payments
        </span>
        <span className="mt-1 block text-sm text-neutral-500">
          Venmo, Cash App, or Zelle. Pick as many as you like.
        </span>
      </label>

      {status === "reading" && (
        <p className="text-sm text-neutral-500">Reading your screenshots…</p>
      )}

      {status === "error" && (
        <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      {warnings.map((warning, index) => (
        <p
          key={`${warning.code}-${index}`}
          className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900"
        >
          {warning.filename && (
            <span className="font-medium">{warning.filename}: </span>
          )}
          {warningMessage(warning)}
        </p>
      ))}

      {status === "done" && transactions.length === 0 && warnings.length === 0 && (
        <p className="text-sm text-neutral-500">
          We couldn&apos;t find any payments in those. Try a screenshot of your
          transactions list.
        </p>
      )}

      {transactions.length > 0 && (
        <ConfirmationSheet
          transactions={transactions}
          onChange={updateTransaction}
        />
      )}
    </div>
  );
}
