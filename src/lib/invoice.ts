/** The shape of everything on an invoice. */

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
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
  unitPrice: 0,
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

export const lineTotal = (item: LineItem): number =>
  Math.round(item.quantity * item.unitPrice * 100) / 100;

export const invoiceTotal = (items: LineItem[]): number =>
  Math.round(items.reduce((sum, item) => sum + lineTotal(item), 0) * 100) / 100;

export const formatMoney = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
