/**
 * The owner's analytics view — types, parsing and the pure helpers the
 * screen renders with. No DOM, no fetch: the API route hands back the
 * JSON that public.admin_overview() (migration 0023) builds, and this
 * module makes it safe to render.
 *
 * Everything money-shaped is integer cents, like the rest of src/lib.
 */

export type OverviewTotals = {
  accounts: number;
  active7d: number;
  active30d: number;
  new30d: number;
  moneyInCents: number;
  moneyOutCents: number;
  owedCents: number;
  transactions: number;
  transactionsScreenshot: number;
  transactionsManual: number;
  sales: number;
  salesPaid: number;
  salesOpen: number;
  salesExpected: number;
  clients: number;
  recurringActive: number;
  foundingSignups: number;
  uploads30d: number;
  images30d: number;
  demoImages30d: number;
  deletionPending: number;
  profiles: number;
};

export type WeekPoint = {
  /** ISO date of the Monday that starts the week. */
  week: string;
  newAccounts: number;
  transactions: number;
  moneyInCents: number;
};

export type DayPoint = { day: string; uploads: number; images: number };

export type AccountRow = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  lang: string;
  isTester: boolean;
  transactions: number;
  moneyInCents: number;
  moneyOutCents: number;
  sales: number;
  owedCents: number;
  clients: number;
  recurringActive: number;
  uploads30d: number;
  lastActivityAt: string | null;
  deletionRequestedAt: string | null;
  hasProfile: boolean;
};

export type Overview = {
  generatedAt: string;
  totals: OverviewTotals;
  weekly: WeekPoint[];
  dailyUploads: DayPoint[];
  languages: { lang: string; accounts: number }[];
  accounts: AccountRow[];
  storage: { dbBytes: number; tables: { name: string; bytes: number }[] };
};

/** The free tier's database ceiling DEPLOY.md tracks (500 MB). */
export const DB_CEILING_BYTES = 500 * 1024 * 1024;

const num = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))
      ? Number(value)
      : 0;
const str = (value: unknown): string | null =>
  typeof value === "string" ? value : null;
const bool = (value: unknown): boolean => value === true;
const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    : [];

/**
 * Turns the function's snake_case JSON into the typed shape above. Postgres
 * hands bigints back as strings through JSON, hence `num` accepting both.
 * Anything missing reads as zero/empty rather than throwing — a half-formed
 * payload renders as an honest "0", never a crash on the owner's screen.
 */
export const parseOverview = (raw: unknown): Overview => {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t = (root.totals && typeof root.totals === "object" ? root.totals : {}) as Record<string, unknown>;
  const storage = (root.storage && typeof root.storage === "object" ? root.storage : {}) as Record<string, unknown>;
  return {
    generatedAt: str(root.generated_at) ?? "",
    totals: {
      accounts: num(t.accounts),
      active7d: num(t.active_7d),
      active30d: num(t.active_30d),
      new30d: num(t.new_30d),
      moneyInCents: num(t.money_in_cents),
      moneyOutCents: num(t.money_out_cents),
      owedCents: num(t.owed_cents),
      transactions: num(t.transactions),
      transactionsScreenshot: num(t.transactions_screenshot),
      transactionsManual: num(t.transactions_manual),
      sales: num(t.sales),
      salesPaid: num(t.sales_paid),
      salesOpen: num(t.sales_open),
      salesExpected: num(t.sales_expected),
      clients: num(t.clients),
      recurringActive: num(t.recurring_active),
      foundingSignups: num(t.founding_signups),
      uploads30d: num(t.uploads_30d),
      images30d: num(t.images_30d),
      demoImages30d: num(t.demo_images_30d),
      deletionPending: num(t.deletion_pending),
      profiles: num(t.profiles),
    },
    weekly: list(root.weekly).map((w) => ({
      week: str(w.week) ?? "",
      newAccounts: num(w.new_accounts),
      transactions: num(w.transactions),
      moneyInCents: num(w.money_in_cents),
    })),
    dailyUploads: list(root.daily_uploads).map((d) => ({
      day: str(d.day) ?? "",
      uploads: num(d.uploads),
      images: num(d.images),
    })),
    languages: list(root.languages).map((l) => ({
      lang: str(l.lang) ?? "en",
      accounts: num(l.accounts),
    })),
    accounts: list(root.accounts).map((a) => ({
      id: str(a.id) ?? "",
      email: str(a.email),
      createdAt: str(a.created_at) ?? "",
      lastSignInAt: str(a.last_sign_in_at),
      lang: str(a.lang) ?? "en",
      isTester: bool(a.is_tester),
      transactions: num(a.transactions),
      moneyInCents: num(a.money_in_cents),
      moneyOutCents: num(a.money_out_cents),
      sales: num(a.sales),
      owedCents: num(a.owed_cents),
      clients: num(a.clients),
      recurringActive: num(a.recurring_active),
      uploads30d: num(a.uploads_30d),
      lastActivityAt: str(a.last_activity_at),
      deletionRequestedAt: str(a.deletion_requested_at),
      hasProfile: bool(a.has_profile),
    })),
    storage: {
      dbBytes: num(storage.db_bytes),
      tables: list(storage.tables).map((row) => ({
        name: str(row.name) ?? "",
        bytes: num(row.bytes),
      })),
    },
  };
};

/** "3 days ago" / "today" / "never" — relative to `now`, in whole days. */
export const daysAgoLabel = (iso: string | null, now: Date): string => {
  if (!iso) return "never";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "never";
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
};

/** 12127379 → "11.6 MB". Binary units, one decimal, like the DEPLOY.md table. */
export const bytesLabel = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/** Share of the ceiling used, 0–100, capped so a bar never overflows. */
export const percentOf = (part: number, whole: number): number =>
  whole <= 0 ? 0 : Math.min(100, Math.max(0, (part / whole) * 100));

/**
 * Points for an SVG polyline over a fixed box. All-zero series draw a flat
 * baseline (not NaN); a single point draws a dot-length line at its value.
 */
export const sparklinePoints = (
  values: number[],
  width: number,
  height: number,
  padding = 2,
): string => {
  if (values.length === 0) return "";
  const max = Math.max(...values, 0);
  const innerH = height - padding * 2;
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = padding + i * stepX;
      const y = max === 0 ? height - padding : padding + innerH - (v / max) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

/** Bar heights (0–1) for a column chart; all-zero → all zero bars. */
export const barScale = (values: number[]): number[] => {
  const max = Math.max(...values, 0);
  return values.map((v) => (max === 0 ? 0 : v / max));
};

/** "en" | "es" | "pt" → the language's own name; unknown codes pass through. */
export const languageLabel = (lang: string): string =>
  ({ en: "English", es: "Español", pt: "Português" })[lang] ?? lang;

/**
 * A believable, obviously fake payload for the development-only sample view
 * (`/app/admin?sample=1` outside production) so the layout can be checked
 * without a service key or real accounts. Nothing here is a real person.
 */
export const sampleOverview = (now: Date): Overview => {
  const iso = (daysBack: number) => new Date(now.getTime() - daysBack * 86_400_000).toISOString();
  const monday = (weeksBack: number) => {
    const d = new Date(now);
    const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow - weeksBack * 7);
    return d.toISOString().slice(0, 10);
  };
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const back = 11 - i;
    return { week: monday(back), newAccounts: [0, 1, 0, 2, 1, 1, 3, 2, 4, 3, 5, 2][i], transactions: [2, 5, 3, 9, 8, 12, 15, 11, 20, 18, 26, 14][i], moneyInCents: [12000, 48000, 30500, 91000, 77000, 120000, 152500, 99000, 210000, 188000, 265000, 140000][i] };
  });
  const dailyUploads = Array.from({ length: 30 }, (_, i) => ({
    day: iso(29 - i).slice(0, 10),
    uploads: [0, 1, 0, 2, 1, 0, 3, 1, 2, 0, 1, 4, 2, 1, 0, 2, 3, 1, 0, 2, 5, 2, 1, 3, 0, 2, 4, 1, 2, 3][i],
    images: [0, 2, 0, 3, 1, 0, 6, 1, 4, 0, 2, 7, 3, 1, 0, 2, 5, 1, 0, 3, 9, 2, 1, 4, 0, 2, 6, 1, 3, 4][i],
  }));
  const account = (n: number, over: Partial<AccountRow>): AccountRow => ({
    id: `00000000-0000-4000-8000-00000000000${n}`,
    email: `sample${n}@example.com`,
    createdAt: iso(90 - n * 7),
    lastSignInAt: iso(n),
    lang: ["en", "es", "pt"][n % 3],
    isTester: false,
    transactions: 40 - n * 4,
    moneyInCents: 250000 - n * 21000,
    moneyOutCents: 42000 - n * 3000,
    sales: 18 - n,
    owedCents: n % 2 ? 12000 : 0,
    clients: 9 - n,
    recurringActive: n % 3,
    uploads30d: 6 - (n % 4),
    lastActivityAt: iso(n),
    deletionRequestedAt: null,
    hasProfile: n % 2 === 0,
    ...over,
  });
  const accounts = [
    ...Array.from({ length: 7 }, (_, i) => account(i + 1, {})),
    account(8, { email: "tester@sample.example", isTester: true, lang: "en" }),
    account(9, { deletionRequestedAt: iso(2), transactions: 3, moneyInCents: 9000 }),
  ];
  const totals = accounts.filter((a) => !a.isTester);
  const sum = (pick: (a: AccountRow) => number) => totals.reduce((s, a) => s + pick(a), 0);
  return {
    generatedAt: now.toISOString(),
    totals: {
      accounts: totals.length,
      active7d: totals.filter((a) => (a.lastActivityAt ?? "") >= iso(7)).length,
      active30d: totals.length,
      new30d: 3,
      moneyInCents: sum((a) => a.moneyInCents),
      moneyOutCents: sum((a) => a.moneyOutCents),
      owedCents: sum((a) => a.owedCents),
      transactions: sum((a) => a.transactions),
      transactionsScreenshot: Math.round(sum((a) => a.transactions) * 0.7),
      transactionsManual: sum((a) => a.transactions) - Math.round(sum((a) => a.transactions) * 0.7),
      sales: sum((a) => a.sales),
      salesPaid: Math.round(sum((a) => a.sales) * 0.8),
      salesOpen: 6,
      salesExpected: sum((a) => a.sales) - Math.round(sum((a) => a.sales) * 0.8) - 6,
      clients: sum((a) => a.clients),
      recurringActive: sum((a) => a.recurringActive),
      foundingSignups: 41,
      uploads30d: dailyUploads.reduce((s, d) => s + d.uploads, 0),
      images30d: dailyUploads.reduce((s, d) => s + d.images, 0),
      demoImages30d: 9,
      deletionPending: 1,
      profiles: totals.filter((a) => a.hasProfile).length,
    },
    weekly,
    dailyUploads,
    languages: [
      { lang: "en", accounts: 4 },
      { lang: "es", accounts: 3 },
      { lang: "pt", accounts: 1 },
    ],
    accounts,
    storage: {
      dbBytes: 12_127_379,
      tables: [
        { name: "sales", bytes: 4_300_000 },
        { name: "transactions", bytes: 2_100_000 },
        { name: "clients", bytes: 900_000 },
        { name: "extraction_usage", bytes: 120_000 },
      ],
    },
  };
};
