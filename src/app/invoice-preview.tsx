// parked prototype — future payment-links module, do not extend.

import {
  formatCents,
  invoiceTotalCents,
  lineTotalCents,
  type Invoice,
} from "@/lib/invoice";

/**
 * The paper. Always white with black text, regardless of app theme —
 * this is a document, not a screen.
 */
export default function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const items = invoice.items.filter(
    (item) => item.description.trim() !== "" || lineTotalCents(item) !== 0,
  );

  return (
    <article className="bg-white text-neutral-900 p-10 shadow-sm ring-1 ring-neutral-200 aspect-[8.5/11]">
      <header className="flex justify-between items-start gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {invoice.businessName || "Your business"}
          </h2>
        </div>
        <div className="text-right text-sm">
          <p className="text-xl font-semibold tracking-tight">INVOICE</p>
          {invoice.invoiceNumber && <p>#{invoice.invoiceNumber}</p>}
        </div>
      </header>

      <section className="mt-10 flex justify-between gap-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Bill to
          </p>
          <p className="font-medium">{invoice.customerName || "Customer"}</p>
          {invoice.customerAddress && (
            <p className="whitespace-pre-line text-neutral-600">
              {invoice.customerAddress}
            </p>
          )}
        </div>
        <div className="text-right">
          {invoice.issueDate && (
            <p>
              <span className="text-neutral-500">Issued </span>
              {invoice.issueDate}
            </p>
          )}
          {invoice.dueDate && (
            <p>
              <span className="text-neutral-500">Due </span>
              {invoice.dueDate}
            </p>
          )}
        </div>
      </section>

      <table className="mt-10 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left">
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 font-medium text-right w-16">Qty</th>
            <th className="pb-2 font-medium text-right w-28">Unit price</th>
            <th className="pb-2 font-medium text-right w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-neutral-400">
                No items yet
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right tabular-nums">
                  {item.quantity}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatCents(item.unitPriceCents)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatCents(lineTotalCents(item))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 flex justify-between border-t-2 border-neutral-900 pt-2 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {formatCents(invoiceTotalCents(invoice.items))}
          </span>
        </div>
      </div>

      {invoice.notes && (
        <footer className="mt-10 text-sm text-neutral-600">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Notes
          </p>
          <p className="whitespace-pre-line">{invoice.notes}</p>
        </footer>
      )}
    </article>
  );
}
