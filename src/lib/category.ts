/**
 * Schedule-C-grade expense categories — v0.6.5. A LABEL on an expense row,
 * nothing more. The hard boundary stands: no tax-filing logic. The category
 * maps to the Schedule C line a preparer would file it under, so the tax
 * CSV arrives pre-sorted — the preparer does the taxes, we do the sorting.
 *
 * `id` is what the database stores (stable, English, never shown raw).
 * `scheduleC` is the English line name for the CSV (preparers read English
 * forms regardless of what language the owner speaks).
 * The on-screen names live in messages/cats.ts, trilingual.
 */

export type CategoryId =
  | "supplies"
  | "car"
  | "advertising"
  | "insurance"
  | "legal"
  | "office"
  | "rent"
  | "repairs"
  | "contract"
  | "travel"
  | "meals"
  | "utilities"
  | "other";

export const CATEGORIES: readonly { id: CategoryId; scheduleC: string }[] = [
  { id: "supplies", scheduleC: "Supplies (line 22)" },
  { id: "car", scheduleC: "Car and truck expenses (line 9)" },
  { id: "advertising", scheduleC: "Advertising (line 8)" },
  { id: "insurance", scheduleC: "Insurance (line 15)" },
  { id: "legal", scheduleC: "Legal and professional services (line 17)" },
  { id: "office", scheduleC: "Office expense (line 18)" },
  { id: "rent", scheduleC: "Rent or lease (line 20)" },
  { id: "repairs", scheduleC: "Repairs and maintenance (line 21)" },
  { id: "contract", scheduleC: "Contract labor (line 11)" },
  { id: "travel", scheduleC: "Travel (line 24a)" },
  { id: "meals", scheduleC: "Meals (line 24b)" },
  { id: "utilities", scheduleC: "Utilities (line 25)" },
  { id: "other", scheduleC: "Other expenses (line 27a)" },
] as const;

export const isCategoryId = (v: unknown): v is CategoryId =>
  typeof v === "string" && CATEGORIES.some((c) => c.id === v);

/** For the tax CSV. Unknown/absent stays "" — never guess a tax line. */
export const scheduleCLabel = (id: string | null): string =>
  CATEGORIES.find((c) => c.id === id)?.scheduleC ?? "";
