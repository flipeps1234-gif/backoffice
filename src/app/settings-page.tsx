"use client";

import { useState } from "react";
import type { BusinessProfile } from "@/lib/profile";
import {
  activeConsentAt,
  alertsFormDirty,
  hasActiveConsent,
  looksLikeE164,
  storablePhone,
  type NotificationPrefs,
  type NotifyChannel,
} from "@/lib/notify/types";
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
import TermsGate, { LegalLinks } from "./terms-gate";
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
 * set at build time — a support link to nowhere is worse than none. The
 * email row always renders: mail@getcontado.com is the address /contact,
 * the footer, /privacy and the native app already give, and
 * NEXT_PUBLIC_SUPPORT_EMAIL (the same variable the site reads) can
 * repoint it.
 */

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "mail@getcontado.com";

// Every link-shaped row in Catalog and Help & about, whether a <button>
// (an in-app screen) or an <a> (mail, the website).
const rowClass =
  "flex w-full items-center justify-between rounded-lg border border-neutral-300 px-3 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900";

const fieldClass =
  "w-full rounded-md border border-neutral-500 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
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
        className="mt-0.5 h-5 w-5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-neutral-600 dark:text-neutral-400">{desc}</span>
      </span>
    </label>
  );
}

function ChannelAlerts({
  prefs,
  prefsReady,
  onSave,
}: {
  prefs: NotificationPrefs;
  prefsReady: boolean;
  onSave: (prefs: NotificationPrefs) => void;
}) {
  const { t, tag } = useLocale();
  const [channel, setChannel] = useState<NotifyChannel>(prefs.channel);
  const [phone, setPhone] = useState(prefs.phone);
  const [consent, setConsent] = useState(hasActiveConsent(prefs));
  const [savedFlash, setSavedFlash] = useState(false);

  const needsDetails = channel !== "off";
  // Compared as the save would store it, against the stored row read the
  // same way — a STOPped account opens with Save dark (types.ts).
  const dirty = alertsFormDirty(prefs, { channel, phone, consent });
  const phoneOk = !needsDetails || !consent || looksLikeE164(phone.trim());
  const consentAt = activeConsentAt(prefs);
  const optedOut =
    prefs.optedOutAt !== null &&
    (consentAt === null || consentAt < prefs.optedOutAt);

  const channelOption = (value: NotifyChannel, label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={channel === value}
      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium ${
        channel === value
          ? "bg-foreground text-background"
          : "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      }`}
      onClick={() => {
        setChannel(value);
        // Consent is PER CHANNEL — switching channels re-asks; it never
        // carries over (agreeing to WhatsApp is not agreeing to SMS).
        setConsent(
          value === prefs.channel ? hasActiveConsent(prefs) : false,
        );
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-lg border border-neutral-300 p-3 dark:border-neutral-700">
      <p className="text-sm font-medium">{t("settings.whatsappTitle")}</p>
      <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
        {t("settings.whatsappDesc")}
      </p>

      <div className="mt-3 space-y-2">
        {/* group, not radiogroup: the options are aria-pressed buttons, and
            a radiogroup promises radios and arrow keys it never had. */}
        <div className="flex gap-2" role="group" aria-label={t("settings.channelLabel")}>
          {channelOption("off", t("settings.channelOff"))}
          {channelOption("whatsapp", t("settings.channelWhatsapp"))}
          {channelOption("sms", t("settings.channelSms"))}
        </div>

        {needsDetails && (
          <>
            <div>
              <label className={labelClass} htmlFor="notify-phone">
                {t("settings.phoneLabel")}
              </label>
              <input
                id="notify-phone"
                type="tel"
                inputMode="tel"
                className={fieldClass}
                placeholder="+15551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {!phoneOk && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {t("settings.phoneInvalid")}
                </p>
              )}
            </div>

            {/* Consent is the product here: default OFF, explicit, per
                channel, and the tick time is stored — the proof both
                WhatsApp policy and US A2P expect. */}
            <label className="flex min-h-11 items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                {t(
                  channel === "sms"
                    ? "settings.smsConsent"
                    : "settings.whatsappConsent",
                )}
              </span>
            </label>
            {/* The pages the consent points to, right under it (carrier
                opt-in rules ask for terms and privacy at the point of
                consent). */}
            <LegalLinks />

            {consentAt && !optedOut && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {t("settings.consentSince", {
                  date: new Date(consentAt).toLocaleDateString(tag),
                })}
              </p>
            )}
            {optedOut && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t("settings.optedOut")}
              </p>
            )}
          </>
        )}

        <button
          type="button"
          // aria-disabled, not disabled: the save clears `dirty`, and a
          // button that disables itself under focus drops the keyboard user
          // to the document (pass-10 a11y review; pass 5 fixed "Try now").
          aria-disabled={!dirty || !phoneOk || !prefsReady}
          className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 aria-disabled:opacity-40"
          onClick={() => {
            if (!dirty || !phoneOk || !prefsReady) return;
            const now = new Date().toISOString();
            // An old tick timestamp is only still valid PROOF if no STOP
            // came after it. Re-opting in after an opt-out must stamp the
            // fresh tick: the STOP stays on the row, and only a consent
            // dated after it is the re-opt-in (hasActiveConsent). Carrying
            // the pre-STOP date forward would leave a record claiming
            // uninterrupted consent across a STOP, which is exactly what a
            // Meta/carrier dispute reads as ignoring one.
            const stillValid = (at: string | null) =>
              at !== null &&
              (prefs.optedOutAt === null || prefs.optedOutAt < at);
            const kept = (channelConsentAt: string | null) =>
              consent
                ? stillValid(channelConsentAt)
                  ? channelConsentAt
                  : now
                : null;
            // A pre-STOP stamp on the OTHER channel is dead evidence —
            // dropped: the other channel keeps its stamp only if no STOP
            // postdates it (re-selecting that channel later forces a
            // fresh tick anyway).
            const carried = (at: string | null) => (stillValid(at) ? at : null);
            const next: NotificationPrefs = {
              channel: consent || channel === "off" ? channel : "off",
              phone: phone.trim(),
              // Only the SELECTED channel's consent moves; the other
              // channel carries only still-valid history.
              whatsappConsentAt:
                channel === "whatsapp"
                  ? kept(prefs.channel === "whatsapp" ? prefs.whatsappConsentAt : null)
                  : carried(prefs.whatsappConsentAt),
              smsConsentAt:
                channel === "sms"
                  ? kept(prefs.channel === "sms" ? prefs.smsConsentAt : null)
                  : carried(prefs.smsConsentAt),
              // The STOP stays on the row as evidence; a fresh tick dated
              // after it IS the re-opt-in (hasActiveConsent). Nulling it
              // here used to travel in the save — and a save parked offline
              // for hours landed over a STOP texted in between, erasing it
              // (pass-7 concurrency review).
              optedOutAt: prefs.optedOutAt,
            };
            // The number travels only with a ticked box on an active
            // channel (storablePhone): Off, or no consent, saves "" — it
            // used to store whatever sat in the field.
            onSave({ ...next, phone: storablePhone(next) });
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 4000);
          }}
        >
          {t("common.save")}
        </button>
        {/* Mounted for good, text swapped: a live region created with its
            text is not reliably announced. emerald-700: 600 was 3.66:1. */}
        <span className="ml-3 text-sm text-emerald-700 dark:text-emerald-400" aria-live="polite">
          {savedFlash ? t("settings.businessSaved") : ""}
        </span>
      </div>
    </div>
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
          maxLength={400}
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
          maxLength={400}
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
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        {t(signedIn ? "settings.businessHint" : "settings.businessHintAnon")}
      </p>
      {signedIn && !profileReady && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">{t("settings.profileLoading")}</p>
      )}
      <button
        type="button"
        // aria-disabled, not disabled: see the alerts Save above.
        aria-disabled={!dirty || (signedIn && !profileReady)}
        className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 aria-disabled:opacity-40"
        onClick={() => {
          if (!dirty || (signedIn && !profileReady)) return;
          onSaveProfile({
            businessName: businessName.trim(),
            ownerName: ownerName.trim(),
            usState: usState.trim().toUpperCase(),
          });
          setUsState(usState.trim().toUpperCase());
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 4000);
        }}
      >
        {t("common.save")}
      </button>
      {/* Mounted for good, text swapped (see the alerts Save above). */}
      <span className="ml-3 text-sm text-emerald-700 dark:text-emerald-400" aria-live="polite">
        {savedFlash ? t("settings.businessSaved") : ""}
      </span>
    </div>
  );
}

export default function SettingsPage({
  signedIn,
  email,
  profile,
  profileReady,
  hasSaveError,
  saveWaiting = false,
  onSaveProfile,
  notifyPrefs,
  notifyReady,
  onSaveNotifyPrefs,
  deletionRequestedAt,
  onRequestDeletion,
  onCancelDeletion,
  onExportEverything,
  onOpenProducts,
  onOpenClients,
  onShowTour,
  onClose,
  desktop = false,
}: {
  /** The sidebar app has no "home screen"; its failed-save banner sits
   *  at the top of every section. */
  desktop?: boolean;
  signedIn: boolean;
  email: string | null;
  profile: BusinessProfile;
  /** False until the stored profile actually LOADED — saving blank
   *  fields over an unloaded profile would wipe it (review catch). */
  profileReady: boolean;
  /** The persist queue reported a failure — the backup line says so. */
  hasSaveError: boolean;
  /** A save is parked until the network is back (it will be retried). */
  saveWaiting?: boolean;
  onSaveProfile: (profile: BusinessProfile) => void;
  notifyPrefs: NotificationPrefs;
  /** Same gate as profileReady — never seed consent from a failed load. */
  notifyReady: boolean;
  onSaveNotifyPrefs: (prefs: NotificationPrefs) => void;
  /** ISO timestamp of the pending request, or null. */
  deletionRequestedAt: string | null;
  /** Resolve false on failure — the page shows one friendly line. */
  onRequestDeletion: () => Promise<boolean>;
  onCancelDeletion: () => Promise<boolean>;
  onExportEverything: () => void;
  onOpenProducts: () => void;
  onOpenClients: () => void;
  /** Reopens the welcome tour in review mode (prefilled; writes the
   *  profile only if a field changed). */
  onShowTour: () => void;
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
          : "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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
      <span className="mt-0.5 block text-xs text-neutral-600 dark:text-neutral-400">{desc}</span>
    </button>
  );

  const chevron = (
    <span aria-hidden="true" className="text-neutral-400">
      ›
    </span>
  );

  const linkRow = (label: string, onClick: () => void) => (
    <button type="button" className={rowClass} onClick={onClick}>
      {label}
      {chevron}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t("settings.title")}</h2>
        <button
          type="button"
          className="-mx-2 min-h-11 px-2 text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
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
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
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
          {signedIn ? (
            <ChannelAlerts
              key={String(notifyReady)}
              prefs={notifyPrefs}
              prefsReady={notifyReady}
              onSave={onSaveNotifyPrefs}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 p-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
              {t("settings.notifySignIn")}
            </div>
          )}
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
          <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            {t("settings.privacyPromise")}
          </p>
          <LegalLinks />

          {signedIn && email && (
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
                  className="-mx-2 min-h-11 px-2 text-sm font-medium text-red-700 hover:underline dark:text-red-400"
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
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400" htmlFor="delete-confirm">
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
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
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
              ? "text-neutral-600 dark:text-neutral-400"
              : hasSaveError || saveWaiting
                ? "text-amber-700 dark:text-amber-400"
                : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {!signedIn
            ? t("settings.backupNone")
            : saveWaiting
              ? t("settings.backupWaiting")
              : hasSaveError
              ? t(desktop ? "desktop.backupIssue" : "settings.backupIssue")
              : t("settings.backupOk")}
        </p>
      </Section>

      <Section title={t("settings.helpAbout")}>
        <div className="space-y-2">
          {SUPPORT_WHATSAPP && (
            <a
              className={rowClass}
              href={`https://wa.me/${SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("settings.supportWhatsapp")}
              {chevron}
            </a>
          )}
          {/* A real address, not "coming soon" — the native app's row. */}
          <a className={rowClass} href={`mailto:${SUPPORT_EMAIL}`}>
            <span className="min-w-0">
              {t("site.emailUs")}
              <span className="mt-0.5 block break-all text-xs font-normal text-neutral-600 dark:text-neutral-400">
                {SUPPORT_EMAIL}
              </span>
            </span>
            {chevron}
          </a>
          {/* The website's contact page: a new tab, like LegalLinks. */}
          <a className={rowClass} href="/contact" target="_blank" rel="noreferrer">
            {t("site.navContact")}
            {chevron}
          </a>
          {linkRow(t("settings.viewTerms"), () => setShowTerms(true))}
          {/* Same gate as the business Save: before the stored profile
              loaded, the tour would seed blank fields whose Finish could
              overwrite a real row. */}
          <button
            type="button"
            disabled={!profileReady}
            className={`${rowClass} disabled:opacity-40`}
            onClick={onShowTour}
          >
            {t("settings.showTour")}
            {chevron}
          </button>
          {/* Same hint the business Save shows while gated — a disabled
              row with no reason reads as broken. */}
          {signedIn && !profileReady && (
            <p className="px-1 text-xs text-neutral-600 dark:text-neutral-400">{t("settings.profileLoading")}</p>
          )}
          <p className="px-1 text-xs text-neutral-600 dark:text-neutral-400">
            {t("settings.version", { version: APP_VERSION })}
          </p>
        </div>
      </Section>

    </div>
  );
}
