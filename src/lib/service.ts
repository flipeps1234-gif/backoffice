/**
 * The services catalog. A service is a thing you sell — "Lawn mowing",
 * "Haircut" — with either a flat price or a per-unit rate. Money is
 * integer cents, as everywhere.
 */

export type RateUnit = "sqft" | "hour" | "room";

export type Pricing =
  | { type: "flat"; cents: number }
  | { type: "rate"; cents: number; unit: RateUnit };

export type Service = {
  id: string;
  name: string;
  pricing: Pricing;
  /** Per-unit cost ESTIMATE for the future margin view. Never tax data. */
  costCents: number | null;
};

export const UNIT_LABELS: Record<RateUnit, string> = {
  sqft: "sq ft",
  hour: "hour",
  room: "room",
};

/**
 * The inline mini-calc: what does this service cost for this quantity?
 * Quantity may be fractional (2.5 hours, 1200.5 sqft); the result is
 * rounded to a whole cent at the end, not per step.
 */
export const priceFor = (service: Service, quantity = 1): number => {
  if (service.pricing.type === "flat") return service.pricing.cents;
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.round(service.pricing.cents * quantity);
};

/** Chip label: "Lawn mowing · $65" or "Cleaning · $0.18/sq ft". */
export const priceLabel = (service: Service): string => {
  const dollars = (cents: number): string =>
    (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      // Whole-dollar prices read cleaner on a chip: $65, not $65.00.
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    });

  return service.pricing.type === "flat"
    ? dollars(service.pricing.cents)
    : `${dollars(service.pricing.cents)}/${UNIT_LABELS[service.pricing.unit]}`;
};

/** Case-insensitive name lookup so "lawn mowing" doesn't duplicate "Lawn Mowing". */
export const findByName = (
  services: Service[],
  name: string,
): Service | undefined => {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return services.find((s) => s.name.trim().toLowerCase() === needle);
};
