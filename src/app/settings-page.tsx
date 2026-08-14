"use client";

import { setSaleFlow, setTheme, type SaleFlowOrder, type Theme } from "@/lib/settings";
import LocalePicker from "./locale-picker";
import { useLocale } from "./use-locale";
import { useSaleFlow, useTheme } from "./use-settings";

/**
 * Settings — v0.6.6. Three things, all device-local: language,
 * appearance, and which way the New Sale flow runs (the v0.5 parked
 * decision, unparked). No account settings live here yet, so there is
 * nothing to sync and nothing to migrate.
 */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function SettingsPage({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const theme = useTheme();
  const saleFlow = useSaleFlow();

  const themeOption = (value: Theme, label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={theme === value}
      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium ${
        theme === value
          ? "bg-foreground text-background"
          : "border border-neutral-300 bg-white text-neutral-900"
      }`}
      onClick={() => setTheme(value)}
    >
      {label}
    </button>
  );

  const flowOption = (value: SaleFlowOrder, label: string, desc: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={saleFlow === value}
      className={`w-full rounded-lg border p-3 text-left ${
        saleFlow === value
          ? "border-neutral-900 bg-neutral-100 dark:border-neutral-100 dark:bg-neutral-900"
          : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-transparent"
      }`}
      onClick={() => setSaleFlow(value)}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className="mt-0.5 block text-xs text-neutral-500">{desc}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t("settings.title")}</h2>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:underline"
          onClick={onClose}
        >
          {t("common.close")}
        </button>
      </div>

      <Section title={t("settings.language")}>
        <LocalePicker />
      </Section>

      <Section title={t("settings.appearance")}>
        <div className="flex gap-2">
          {themeOption("system", t("settings.themeSystem"))}
          {themeOption("light", t("settings.themeLight"))}
          {themeOption("dark", t("settings.themeDark"))}
        </div>
      </Section>

      <Section title={t("settings.saleFlow")}>
        <div className="space-y-2">
          {flowOption(
            "products-first",
            t("settings.productsFirst"),
            t("settings.productsFirstDesc"),
          )}
          {flowOption(
            "client-first",
            t("settings.clientFirst"),
            t("settings.clientFirstDesc"),
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {t("settings.saleFlowHint")}
        </p>
      </Section>

      <p className="text-xs text-neutral-500">{t("settings.savedNote")}</p>
    </div>
  );
}
