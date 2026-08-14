"use client";

import { useState } from "react";
import type { BusinessProfile } from "@/lib/profile";
import {
  setRecapEnabled,
  setSaleFlow,
  setTaxNoteEnabled,
  setTheme,
  type SaleFlowOrder,
  type Theme,
} from "@/lib/settings";
import { APP_VERSION } from "@/lib/version";
import LocalePicker from "./locale-picker";
import TermsGate from "./terms-gate";
import { useLocale } from "./use-locale";
import {
  useNotifyPrefs,
  useSaleFlow,
  useTheme,
} from "./use-settings";

/**
 * Settings — v0.6.7. Device things (language, appearance, sale order,
 * notices) live in localStorage; the Business section is the app's
 * FIRST account-level setting and persists like everything else the
 * account owns. Deletion is a 7-day request the owner can cancel —
 * the purge runs server-side (migration 0013).
 *
 * The WhatsApp rows render only when NEXT_PUBLIC_SUPPORT_WHATSAPP is
 * set at build time — a support link to nowhere is worse than a
 * "coming soon".
 */

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";

const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-500";

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

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-neutral-300 p-3 dark:border-neutral-700">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-neutral-500">{desc}</span>
      </span>
    </label>
  );
}

function BusinessForm({
  profile,
  signedIn,
  profileReady,
  onSaveProfile,
}: {
  profile: BusinessProfile;
  signedIn: boolean;
  profileReady: boolean;
  onSaveProfile: (profile: BusinessProfile) => void;
}) {
  const { t } = useLocale();
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [usState, setUsState] = useState(profile.usState);
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty =
    businessName.trim() !== profile.businessName ||
    ownerName.trim() !== profile.ownerName ||
    usState.trim().toUpperCase() !== profile.usState;

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass} htmlFor="biz-name">
          {t("settings.businessName")}
        </label>
        <input
          id="biz-name"
          className={fieldClass}
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="biz-owner">
          {t("settings.ownerName")}
        </label>
        <input
          id="biz-owner"
          className={fieldClass}
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="biz-state">
          {t("settings.state")}
        </label>
        <input
          id="biz-state"
          className={`${fieldClass} w-24 text-center uppercase`}
          placeholder="FL"
          maxLength={2}
          value={usState}
          onChange={(e) => setUsState(e.target.value)}
        />
      </div>
      <p className="text-xs text-neutral-500">
        {t(signedIn ? "settings.businessHint" : "settings.businessHintAnon")}
      </p>
      {signedIn && !profileReady && (
        <p className="text-xs text-neutral-500">{t("settings.profileLoading")}</p>
      )}
      <button
        type="button"
        disabled={!dirty || (signedIn && !profileReady)}
        className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
        onClick={() => {
          onSaveProfile({
            businessName: businessName.trim(),
            ownerName: ownerName.trim(),
            usState: usState.trim().toUpperCase(),
          });
          setUsState(usState.trim().toUpperCase());
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 2000);
        }}
      >
        {t("common.save")}
      </button>
      {savedFlash && (
        <span className="ml-3 text-sm text-emerald-600" aria-live="polite">
          {t("settings.businessSaved")}
        </span>
      )}
    </div>
  );
}

export default function SettingsPage({
  signedIn,
  email,
  demoAccount,
  profile,
  profileReady,
  hasSaveError,
  onSaveProfile,
  deletionRequestedAt,
  onRequestDeletion,
  onCancelDeletion,
  onExportEverything,
  onOpenProducts,
  onOpenClients,
  onClose,
}: {
  signedIn: boolean;
  email: string | null;
  demoAccount: boolean;
  profile: BusinessProfile;
  /** False until the stored profile actually LOADED — saving blank
   *  fields over an unloaded profile would wipe it (review catch). */
  profileReady: boolean;
  /** The persist queue reported a failure — the backup line says so. */
  hasSaveError: boolean;
  onSaveProfile: (profile: BusinessProfile) => void;
  /** ISO timestamp of the pending request, or null. */
  deletionRequestedAt: string | null;
  /** Resolve false on failure — the page shows one friendly line. */
  onRequestDeletion: () => Promise<boolean>;
  onCancelDeletion: () => Promise<boolean>;
  onExportEverything: () => void;
  onOpenProducts: () => void;
  onOpenClients: () => void;
  onClose: () => void;
}) {
  const { t, tag } = useLocale();
  const theme = useTheme();
  const saleFlow = useSaleFlow();
  const { recap, taxNote } = useNotifyPrefs();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  if (showTerms) {
    return <TermsGate readOnly onClose={() => setShowTerms(false)} />;
  }

  const emailMatches =
    email !== null &&
    deleteTyped.trim().toLowerCase() === email.trim().toLowerCase();

  // LOCAL date of the eligibility instant — the purge runs at or after
  // it, so the shown date is never later than the truth (review catch:
  // the UTC slice promised a date the purge could beat by a day).
  const purgeDate = deletionRequestedAt
    ? new Date(Date.parse(deletionRequestedAt) + 7 * 86_400_000)
        .toLocaleDateString(tag)
    : null;

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

  const linkRow = (label: string, onClick: () => void) => (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-lg border border-neutral-300 px-3 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
      onClick={onClick}
    >
      {label}
      <span aria-hidden="true" className="text-neutral-400">
        ›
      </span>
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

      <Section title={t("settings.business")}>
        <BusinessForm
          // Remounts ONLY this form when the stored profile lands, so
          // its fields reseed without wiping any other settings state
          // (the page-level remount ate a typed delete-confirm).
          key={String(profileReady)}
          profile={profile}
          signedIn={signedIn}
          profileReady={profileReady}
          onSaveProfile={onSaveProfile}
        />
      </Section>

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

      <Section title={t("settings.catalog")}>
        <div className="space-y-2">
          {linkRow(t("settings.openProducts"), onOpenProducts)}
          {linkRow(t("settings.openClients"), onOpenClients)}
        </div>
      </Section>

      <Section title={t("settings.notifications")}>
        <div className="space-y-2">
          <Toggle
            checked={recap}
            onChange={setRecapEnabled}
            label={t("settings.recapToggle")}
            desc={t("settings.recapDesc")}
          />
          <Toggle
            checked={taxNote}
            onChange={setTaxNoteEnabled}
            label={t("settings.taxToggle")}
            desc={t("settings.taxDesc")}
          />
          <div className="rounded-lg border border-dashed border-neutral-300 p-3 text-sm text-neutral-400 dark:border-neutral-700">
            {t("settings.whatsappSoon")}
          </div>
        </div>
      </Section>

      <Section title={t("settings.dataPrivacy")}>
        <div className="space-y-3">
          <button
            type="button"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            onClick={onExportEverything}
          >
            {t("settings.exportAll")}
          </button>
          <p className="text-xs leading-relaxed text-neutral-500">
            {t("settings.privacyPromise")}
          </p>

          {signedIn && demoAccount && (
            <p className="text-xs text-neutral-500">
              {t("settings.deleteDemo")}
            </p>
          )}
          {signedIn && !demoAccount && email && (
            <div className="rounded-lg border border-red-200 p-3 dark:border-red-900">
              {purgeDate ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {t("settings.deletePending", { date: purgeDate })}
                  </p>
                  <button
                    type="button"
                    disabled={deleteBusy}
                    className="rounded-lg border border-neutral-400 px-4 py-2.5 text-sm font-medium disabled:opacity-40"
                    onClick={() => {
                      setDeleteBusy(true);
                      setDeleteError(false);
                      void onCancelDeletion().then((ok) => {
                        setDeleteBusy(false);
                        if (!ok) {
                          setDeleteError(true);
                          return;
                        }
                        // Back to the un-armed state — cancelling must
                        // not drop into a still-armed confirm form.
                        setDeleteOpen(false);
                        setDeleteTyped("");
                      });
                    }}
                  >
                    {t("settings.deleteCancel")}
                  </button>
                </div>
              ) : !deleteOpen ? (
                <button
                  type="button"
                  className="text-sm font-medium text-red-700 hover:underline dark:text-red-400"
                  onClick={() => {
                    setDeleteError(false);
                    setDeleteOpen(true);
                  }}
                >
                  {t("settings.deleteAccount")}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    {t("settings.deleteExplain")}
                  </p>
                  <label className="block text-xs text-neutral-500" htmlFor="delete-confirm">
                    {t("settings.deleteTypeEmail", { email })}
                  </label>
                  <input
                    id="delete-confirm"
                    className={fieldClass}
                    autoComplete="off"
                    value={deleteTyped}
                    onChange={(e) => setDeleteTyped(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!emailMatches || deleteBusy}
                      className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                      onClick={() => {
                        setDeleteBusy(true);
                        setDeleteError(false);
                        void onRequestDeletion().then((ok) => {
                          setDeleteBusy(false);
                          if (!ok) setDeleteError(true);
                        });
                      }}
                    >
                      {t("settings.deleteConfirm")}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-neutral-400 px-4 py-2.5 text-sm font-medium"
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeleteTyped("");
                        setDeleteError(false);
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
              {deleteError && (
                <p className="mt-2 text-sm text-red-600">
                  {t("settings.deleteFailed")}
                </p>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title={t("settings.backup")}>
        <p
          className={`text-sm ${
            !signedIn
              ? "text-neutral-500"
              : hasSaveError
                ? "text-amber-700 dark:text-amber-400"
                : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {!signedIn
            ? t("settings.backupNone")
            : hasSaveError
              ? t("settings.backupIssue")
              : t("settings.backupOk")}
        </p>
      </Section>

      <Section title={t("settings.helpAbout")}>
        <div className="space-y-2">
          {SUPPORT_WHATSAPP ? (
            <a
              className="flex w-full items-center justify-between rounded-lg border border-neutral-300 px-3 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              href={`https://wa.me/${SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("settings.supportWhatsapp")}
              <span aria-hidden="true" className="text-neutral-400">
                ›
              </span>
            </a>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 p-3 text-sm text-neutral-400 dark:border-neutral-700">
              {t("settings.supportSoon")}
            </div>
          )}
          {linkRow(t("settings.viewTerms"), () => setShowTerms(true))}
          <p className="px-1 text-xs text-neutral-500">
            {t("settings.version", { version: APP_VERSION })}
          </p>
        </div>
      </Section>

    </div>
  );
}
