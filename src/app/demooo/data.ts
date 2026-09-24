/* Sample data for the /demooo preview: one made-up cleaning business.
   Money is integer cents, like the ledger. The demo's "today" is fixed so
   the ages on the Owed screen always read the same. */

export const DEMO_TODAY = "2026-09-24";

export type Unit = "flat" | "hour" | "room" | "sqft";

export type Product = {
  id: string;
  name: string;
  unit: Unit;
  priceCents: number;
  costCents: number;
  /** Jobs and revenue from January to August, before this session. */
  baseJobs: number;
  baseCents: number;
};

export type Client = {
  id: string;
  name: string;
  notes: string;
  miles: number | null;
  recurring: string | null;
  /** Paid by this client from January to August. */
  basePaidCents: number;
};

export type Entry = {
  id: string;
  date: string;
  dir: "in" | "out";
  cents: number;
  name: string;
  what: string;
  source: "cash" | "screenshot";
  business: boolean;
  clientId?: string;
  productId?: string;
};

export type SaleLine = { productId: string | null; label: string; qty: number; cents: number };

export type SaleStatus = "owed" | "cash" | "waiting";

export type Sale = {
  id: string;
  clientId: string | null;
  date: string;
  lines: SaleLine[];
  totalCents: number;
  status: SaleStatus;
};

export const UNIT_LABEL: Record<Unit, string> = {
  flat: "flat",
  hour: "per hour",
  room: "per room",
  sqft: "per sq ft",
};

export const CATEGORIES = [
  "Supplies",
  "Car & truck",
  "Advertising",
  "Insurance",
  "Legal & professional",
  "Office",
  "Rent or lease",
  "Repairs",
  "Contract labor",
  "Travel",
  "Meals",
  "Utilities",
  "Other",
];

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Full-house cleaning", unit: "flat", priceCents: 12000, costCents: 2200, baseJobs: 172, baseCents: 2064000 },
  { id: "p2", name: "Deep clean", unit: "flat", priceCents: 22000, costCents: 4800, baseJobs: 50, baseCents: 1100000 },
  { id: "p3", name: "Move-out clean", unit: "flat", priceCents: 26000, costCents: 6500, baseJobs: 29, baseCents: 754000 },
  { id: "p4", name: "Windows", unit: "room", priceCents: 2500, costCents: 300, baseJobs: 38, baseCents: 380000 },
];

export const CLIENTS: Client[] = [
  { id: "c1", name: "Sarah Johnson", notes: "Gate code 4412. Dog is Biscuit.", miles: 16, recurring: "Every 2 weeks · Full-house cleaning", basePaidCents: 192000 },
  { id: "c2", name: "Dana Whitfield", notes: "Deep clean plus windows, usually on Fridays.", miles: 28, recurring: null, basePaidCents: 336000 },
  { id: "c3", name: "Oak Street Rentals", notes: "Keys in the lockbox, code 1907. Invoice to the property manager.", miles: 12, recurring: null, basePaidCents: 598000 },
  { id: "c4", name: "Priya Nair", notes: "", miles: 22, recurring: "Every month · Full-house cleaning", basePaidCents: 72000 },
  { id: "c5", name: "Marcus Lee", notes: "Prefers mornings.", miles: 10, recurring: "Every week · Full-house cleaning", basePaidCents: 408000 },
  { id: "c6", name: "Hannah Brooks", notes: "", miles: 18, recurring: "Every 2 weeks · Full-house cleaning", basePaidCents: 204000 },
  { id: "c7", name: "Alvarez family", notes: "Two floors. Skip the office.", miles: 24, recurring: "Every month · Deep clean", basePaidCents: 176000 },
  { id: "c8", name: "Kevin Tran", notes: "", miles: 14, recurring: null, basePaidCents: 90000 },
];

/** January to August, business money. September comes from the entries. */
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
];
export const BASE_IN = [421000, 388000, 514000, 562000, 631000, 698000, 745000, 672000];
export const BASE_OUT = [91000, 76000, 123000, 104000, 138000, 151000, 129000, 142000];
export const BASE_MILES = 1860;
export const BASE_VISITS = 142;

const day = (d: number) => `2026-09-${String(d).padStart(2, "0")}`;

/* September's money in: a rotation of real-looking jobs, day by day, up to
   about $5,190 — the month the design showed. */
const ROTATION: [string, string, "cash" | "screenshot"][] = [
  ["c5", "p1", "screenshot"],
  ["c3", "p3", "screenshot"],
  ["c6", "p1", "cash"],
  ["c7", "p2", "screenshot"],
  ["c8", "p4", "cash"],
  ["c5", "p1", "screenshot"],
  ["c3", "p3", "screenshot"],
  ["c6", "p1", "cash"],
];
const PER_DAY = [2, 1, 2, 1, 2, 0, 2, 1, 2, 2, 1, 0, 2];

function septemberIn(): Entry[] {
  const target = 519000;
  const out: Entry[] = [];
  let total = 0;
  let r = 0;
  for (let d = 1; d <= 23 && total < target; d++) {
    const n = PER_DAY[(d - 1) % PER_DAY.length];
    for (let k = 0; k < n && total < target; k++) {
      const [clientId, productId, source] = ROTATION[r++ % ROTATION.length];
      const client = CLIENTS.find((c) => c.id === clientId)!;
      const product = PRODUCTS.find((p) => p.id === productId)!;
      const cents = product.unit === "room" ? product.priceCents * 4 : product.priceCents;
      if (cents > target - total) return out;
      out.push({
        id: `sin-${d}-${k}`,
        date: day(d),
        dir: "in",
        cents,
        name: client.name,
        what: product.unit === "room" ? `${product.name}, 4 rooms` : product.name,
        source,
        business: true,
        clientId,
        productId,
      });
      total += cents;
    }
  }
  return out;
}

const septemberOut: Entry[] = [
  ["2026-09-02", 14500, "Next Insurance", "Insurance"],
  ["2026-09-03", 4800, "Shell", "Car & truck"],
  ["2026-09-05", 8900, "Costco", "Supplies"],
  ["2026-09-08", 5000, "Facebook ads", "Advertising"],
  ["2026-09-10", 5200, "Shell", "Car & truck"],
  ["2026-09-13", 3420, "Home Depot", "Supplies"],
  ["2026-09-15", 24000, "Maria (helper)", "Contract labor"],
  ["2026-09-17", 5100, "Shell", "Car & truck"],
  ["2026-09-19", 2100, "Ace Hardware", "Supplies"],
  ["2026-09-20", 6500, "Phone bill", "Utilities"],
  ["2026-09-22", 4900, "Shell", "Car & truck"],
  ["2026-09-23", 13580, "Costco", "Supplies"],
].map(([date, cents, name, what], i) => ({
  id: `sout-${i}`,
  date: date as string,
  dir: "out" as const,
  cents: cents as number,
  name: name as string,
  what: what as string,
  source: (i % 3 === 1 ? "cash" : "screenshot") as "cash" | "screenshot",
  business: true,
}));

export const ENTRIES: Entry[] = [...septemberIn(), ...septemberOut];

/** Sales still owed — the four on the Owed screen. */
export const SALES: Sale[] = [
  { id: "s1", clientId: "c1", date: "2026-09-12", lines: [{ productId: "p1", label: "Full-house cleaning", qty: 1, cents: 12000 }], totalCents: 12000, status: "owed" },
  { id: "s2", clientId: "c2", date: "2026-08-29", lines: [{ productId: "p2", label: "Deep clean", qty: 2, cents: 44000 }, { productId: "p4", label: "Windows", qty: 8, cents: 20000 }], totalCents: 64000, status: "owed" },
  { id: "s3", clientId: "c3", date: "2026-08-14", lines: [{ productId: "p3", label: "Move-out clean", qty: 1, cents: 26000 }, { productId: "p4", label: "Windows", qty: 4, cents: 10000 }], totalCents: 36000, status: "owed" },
  { id: "s4", clientId: "c4", date: "2026-07-19", lines: [{ productId: "p1", label: "Full-house cleaning", qty: 1, cents: 12000 }, { productId: null, label: "Oven, inside", qty: 1, cents: 10000 }], totalCents: 22000, status: "owed" },
];

/* ---------- small helpers ---------- */

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export function dayLabel(date: string): string {
  const d = daysBetween(date, DEMO_TODAY);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

let seq = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${seq++}`;
