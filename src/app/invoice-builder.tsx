"use client";

import { useState } from "react";
import InvoicePreview from "./invoice-preview";
import { emptyInvoice, emptyItem, type Invoice, type LineItem } from "@/lib/invoice";

const labelClass = "block text-xs font-medium text-neutral-500 mb-1";
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

export default function InvoiceBuilder() {
  const [invoice, setInvoice] = useState<Invoice>(emptyInvoice);

  // Update one top-level field, leaving the rest of the invoice untouched.
  function setField<K extends keyof Invoice>(field: K, value: Invoice[K]) {
    setInvoice((current) => ({ ...current, [field]: value }));
  }

  function setItem<K extends keyof LineItem>(
    id: string,
    field: K,
    value: LineItem[K],
  ) {
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function addItem() {
    setInvoice((current) => ({
      ...current,
      items: [...current.items, emptyItem(`item-${crypto.randomUUID()}`)],
    }));
  }

  function removeItem(id: string) {
    setInvoice((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
    }));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold">Your business</legend>
          <div>
            <label className={labelClass} htmlFor="businessName">
              Business name
            </label>
            <input
              id="businessName"
              className={inputClass}
              placeholder="Acme Design Co."
              value={invoice.businessName}
              onChange={(event) => setField("businessName", event.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold">Customer</legend>
          <div>
            <label className={labelClass} htmlFor="customerName">
              Name
            </label>
            <input
              id="customerName"
              className={inputClass}
              placeholder="Jane Doe"
              value={invoice.customerName}
              onChange={(event) => setField("customerName", event.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="customerAddress">
              Address
            </label>
            <textarea
              id="customerAddress"
              rows={3}
              className={inputClass}
              placeholder="123 Main St&#10;Springfield, IL 62701"
              value={invoice.customerAddress}
              onChange={(event) =>
                setField("customerAddress", event.target.value)
              }
            />
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-3 gap-3">
          <legend className="text-sm font-semibold mb-4">Invoice details</legend>
          <div>
            <label className={labelClass} htmlFor="invoiceNumber">
              Number
            </label>
            <input
              id="invoiceNumber"
              className={inputClass}
              placeholder="0001"
              value={invoice.invoiceNumber}
              onChange={(event) =>
                setField("invoiceNumber", event.target.value)
              }
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="issueDate">
              Issued
            </label>
            <input
              id="issueDate"
              type="date"
              className={inputClass}
              value={invoice.issueDate}
              onChange={(event) => setField("issueDate", event.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="dueDate">
              Due
            </label>
            <input
              id="dueDate"
              type="date"
              className={inputClass}
              value={invoice.dueDate}
              onChange={(event) => setField("dueDate", event.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold mb-2">Line items</legend>
          {invoice.items.map((item) => (
            <div key={item.id} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className={labelClass} htmlFor={`${item.id}-desc`}>
                  Description
                </label>
                <input
                  id={`${item.id}-desc`}
                  className={inputClass}
                  placeholder="Logo design"
                  value={item.description}
                  onChange={(event) =>
                    setItem(item.id, "description", event.target.value)
                  }
                />
              </div>
              <div className="w-20">
                <label className={labelClass} htmlFor={`${item.id}-qty`}>
                  Qty
                </label>
                <input
                  id={`${item.id}-qty`}
                  type="number"
                  min="0"
                  step="1"
                  className={inputClass}
                  value={item.quantity}
                  onChange={(event) =>
                    setItem(item.id, "quantity", Number(event.target.value))
                  }
                />
              </div>
              <div className="w-28">
                <label className={labelClass} htmlFor={`${item.id}-price`}>
                  Unit price
                </label>
                <input
                  id={`${item.id}-price`}
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={item.unitPrice}
                  onChange={(event) =>
                    setItem(item.id, "unitPrice", Number(event.target.value))
                  }
                />
              </div>
              <button
                type="button"
                aria-label="Remove item"
                className="mb-2 px-2 text-neutral-400 hover:text-red-600 disabled:opacity-30"
                disabled={invoice.items.length === 1}
                onClick={() => removeItem(item.id)}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-medium text-foreground hover:underline"
            onClick={addItem}
          >
            + Add item
          </button>
        </fieldset>

        <fieldset>
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={2}
            className={inputClass}
            placeholder="Payment due within 30 days."
            value={invoice.notes}
            onChange={(event) => setField("notes", event.target.value)}
          />
        </fieldset>
      </form>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <InvoicePreview invoice={invoice} />
      </div>
    </div>
  );
}
