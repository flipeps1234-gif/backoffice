"use client";

import { useState } from "react";
import ProductCard from "./product-card";
import { findByName, type RateUnit, type Service } from "@/lib/service";
import { dollarsToCents } from "@/lib/transaction";
import { useLocale } from "./use-locale";

/**
 * Products & services: the catalog, in the sketch's card style. Tap a
 * card to edit its name, price and cost ("log product margins" — the
 * cost field is where a margin comes from). "New product" at the bottom,
 * exactly where the sketch puts it.
 */

const labelClass = "mb-1 block text-xs font-medium text-neutral-500";
const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

type PricingChoice = "flat" | RateUnit;

const PRICING_LABEL_KEYS = {
  flat: "products.flat",
  hour: "products.perHour",
  room: "products.perRoom",
  sqft: "products.perSqft",
} as const;

function EditForm({
  initial,
  services,
  onSave,
  onCancel,
}: {
  /** null = creating a new product. */
  initial: Service | null;
  services: Service[];
  onSave: (service: Service) => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(initial?.name ?? "");
  const [pricing, setPricing] = useState<PricingChoice>(
    initial?.pricing.type === "rate" ? initial.pricing.unit : "flat",
  );
  const [price, setPrice] = useState(
    initial ? (initial.pricing.cents / 100).toFixed(2) : "",
  );
  const [cost, setCost] = useState(
    initial?.costCents != null ? (initial.costCents / 100).toFixed(2) : "",
  );
  const [error, setError] = useState("");

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = findByName(services, trimmed);
    if (existing && existing.id !== initial?.id) {
      setError(t("products.duplicate", { name: existing.name }));
      return;
    }
    const priceCents = dollarsToCents(price);
    if (priceCents === 0) {
      setError(t("products.priceZero"));
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      pricing:
        pricing === "flat"
          ? { type: "flat", cents: priceCents }
          : { type: "rate", cents: priceCents, unit: pricing },
      costCents: cost.trim() === "" ? null : dollarsToCents(cost),
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
      <div>
        <label className={labelClass} htmlFor="prod-name">
          {t("products.nameLabel")}
        </label>
        <input
          id="prod-name"
          className={fieldClass}
          placeholder={t("products.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <fieldset>
        <legend className={labelClass}>{t("products.pricingLegend")}</legend>
        <div className="grid grid-cols-4 gap-2">
          {(["flat", "hour", "room", "sqft"] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={pricing === choice}
              className={`rounded-lg px-2 py-2 text-sm font-medium ${
                pricing === choice
                  ? "bg-foreground text-background"
                  : "border border-neutral-300 bg-white text-neutral-900"
              }`}
              onClick={() => setPricing(choice)}
            >
              {t(PRICING_LABEL_KEYS[choice])}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="prod-price">
            {pricing === "flat"
              ? t("products.gainPrice")
              : t("products.gainPricePerUnit")}
          </label>
          <input
            id="prod-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className={fieldClass}
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="prod-cost">
            {t("products.lossCost")}
          </label>
          <input
            id="prod-cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className={fieldClass}
            placeholder={t("products.costPlaceholder")}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={name.trim() === "" || price.trim() === ""}
          className="flex-1 rounded-lg bg-foreground px-4 py-3 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
          onClick={save}
        >
          {t("common.save")}
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg border border-neutral-400 px-4 py-3 text-base font-medium hover:opacity-80"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}

export default function ProductsPage({
  services,
  onCreate,
  onUpdate,
  onClose,
}: {
  services: Service[];
  onCreate: (service: Service) => void;
  onUpdate: (service: Service) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  /** "new" | a service id | null (just browsing). */
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t("products.title")}</h2>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:underline"
          onClick={onClose}
        >
          {t("common.close")}
        </button>
      </div>

      {services.length === 0 && editing === null && (
        <p className="text-sm text-neutral-500">{t("products.empty")}</p>
      )}

      <div className="space-y-3">
        {services.map((service) =>
          editing === service.id ? (
            <EditForm
              key={service.id}
              initial={service}
              services={services}
              onSave={(next) => {
                onUpdate(next);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <ProductCard
              key={service.id}
              service={service}
              onTap={() => setEditing(service.id)}
            />
          ),
        )}
      </div>

      {editing === "new" ? (
        <EditForm
          initial={null}
          services={services}
          onSave={(service) => {
            onCreate(service);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          className="w-full rounded-xl border border-neutral-400 px-4 py-4 text-base font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-900"
          onClick={() => setEditing("new")}
        >
          {t("products.newProduct")}
        </button>
      )}
    </div>
  );
}
