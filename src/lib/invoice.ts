// parked prototype — future payment-links module, do not extend.

/** The shape of everything on an invoice. Money is integer cents. */

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type Invoice = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  businessName: string;
  customerName: string;
  customerAddress: string;
  items: LineItem[];
  notes: string;
};

export const emptyItem = (id: string): LineItem => ({
  id,
  description: "",
  quantity: 1,
  unitPriceCents: 0,
});

export const emptyInvoice: Invoice = {
  invoiceNumber: "",
  issueDate: "",
  dueDate: "",
  businessName: "",
  customerName: "",
  customerAddress: "",
  items: [emptyItem("item-1")],
  notes: "",
};

/** "12.34" -> 1234. Anything unparseable is 0 cents. */
export const dollarsToCents = (input: string): number => {
  const amount = Number.parseFloat(input);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

/** 1234 -> "12.34", for putting cents back into a text input. */
export const centsToDollars = (cents: number): string =>
  (cents / 100).toFixed(2);

export const lineTotalCents = (item: LineItem): number =>
  Math.round(item.quantity) * item.unitPriceCents;

export const invoiceTotalCents = (items: LineItem[]): number =>
  items.reduce((sum, item) => sum + lineTotalCents(item), 0);

export const formatCents = (cents: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
