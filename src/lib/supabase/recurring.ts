import { getSupabase } from "./client";
import { loadAllPages } from "./paginate";
import { validateLineItems } from "@/lib/sale";
import type { Cadence, RecurringTemplate } from "@/lib/recurring";

type Row = {
  id: string;
  client_id: string;
  line_items: unknown;
  cadence: unknown;
  next_due: string;
  active: boolean;
  consecutive_misses: number;
  ended_on: string | null;
};

/**
 * Cadence crosses a jsonb boundary, so it is validated like everything
 * else that does. An unrecognizable cadence becomes monthly — the
 * slowest option, so a corrupted row under-generates rather than
 * flooding Owed with weekly instances.
 */
const asCadence = (raw: unknown): Cadence => {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    if (r.type === "weekly" || r.type === "biweekly" || r.type === "monthly") {
      return { type: r.type };
    }
    if (
      r.type === "everyN" &&
      typeof r.days === "number" &&
      Number.isInteger(r.days) &&
      r.days >= 1 &&
      r.days <= 365
    ) {
      return { type: "everyN", days: r.days };
    }
  }
  return { type: "monthly" };
};

const toTemplate = (row: Row): RecurringTemplate => ({
  id: row.id,
  clientId: row.client_id,
  lineItems: validateLineItems(row.line_items),
  cadence: asCadence(row.cadence),
  nextDue: row.next_due,
  active: row.active,
  consecutiveMisses: row.consecutive_misses,
  endedOn: row.ended_on,
});

export const loadTemplates = async (): Promise<RecurringTemplate[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const rows = await loadAllPages<Row>((from, to) =>
    supabase
      .from("recurring_templates")
      .select(
        "id, client_id, line_items, cadence, next_due, active, consecutive_misses, ended_on",
      )
      .order("next_due", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  return rows.map(toTemplate);
};

export const insertTemplate = async (
  template: RecurringTemplate,
  accountId: string,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("recurring_templates").insert({
    id: template.id,
    account_id: accountId,
    client_id: template.clientId,
    line_items: template.lineItems,
    cadence: template.cadence,
    next_due: template.nextDue,
    active: template.active,
    consecutive_misses: template.consecutiveMisses,
    ended_on: template.endedOn,
  });
  if (error) throw new Error(error.message);
};

export const updateTemplate = async (
  id: string,
  patch: Partial<RecurringTemplate>,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const row: Record<string, unknown> = {};
  if (patch.lineItems !== undefined) row.line_items = patch.lineItems;
  if (patch.cadence !== undefined) row.cadence = patch.cadence;
  if (patch.nextDue !== undefined) row.next_due = patch.nextDue;
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.consecutiveMisses !== undefined)
    row.consecutive_misses = patch.consecutiveMisses;
  if (patch.endedOn !== undefined) row.ended_on = patch.endedOn;
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("recurring_templates")
    .update(row)
    .eq("id", id);
  if (error) throw new Error(error.message);
};
