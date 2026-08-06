import { getSupabase } from "./client";
import { loadAllPages } from "./paginate";
import type { Pricing, RateUnit, Service } from "@/lib/service";

/** Maps between the Service the UI uses and the row shape in Postgres. */

type Row = {
  id: string;
  name: string;
  pricing_type: string;
  price_cents: number;
  rate_unit: string | null;
  cost_cents: number | null;
};

const toPricing = (row: Row): Pricing =>
  row.pricing_type === "rate" && row.rate_unit
    ? { type: "rate", cents: row.price_cents, unit: row.rate_unit as RateUnit }
    : { type: "flat", cents: row.price_cents };

const toService = (row: Row): Service => ({
  id: row.id,
  name: row.name,
  pricing: toPricing(row),
  costCents: row.cost_cents,
});

const toRow = (service: Service, accountId: string) => ({
  id: service.id,
  account_id: accountId,
  name: service.name,
  pricing_type: service.pricing.type,
  price_cents: service.pricing.cents,
  rate_unit: service.pricing.type === "rate" ? service.pricing.unit : null,
  cost_cents: service.costCents,
});

export const loadServices = async (): Promise<Service[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Paged for the same reason as loadTransactions: PostgREST caps a response
  // at the project's max-rows without saying so. A catalog is unlikely to pass
  // 1000 today, but a chip that silently stops appearing is the kind of bug
  // nobody reports — they just assume they never saved it.
  const rows = await loadAllPages<Row>((from, to) =>
    supabase
      .from("services")
      .select("id, name, pricing_type, price_cents, rate_unit, cost_cents")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );

  return rows.map(toService);
};

export const insertService = async (
  service: Service,
  accountId: string,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("services")
    .insert(toRow(service, accountId));
  if (error) throw new Error(error.message);
};
