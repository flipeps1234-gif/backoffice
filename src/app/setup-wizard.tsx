"use client";

import { useEffect, useRef, useState } from "react";
import type { BusinessProfile } from "@/lib/profile";
import type { Service } from "@/lib/service";
import { SETUP_STEPS, type SetupStep } from "@/lib/setup";
import { SwipePlayground } from "./landing-playground";
import ProductCard from "./product-card";
import { EditForm } from "./products-page";
import { useLocale } from "./use-locale";

/**
 * The welcome tour — 2026-09-10, reshaped 2026-09-11. Four screens
 * between sign-in and the hub, once per account (the rule is
 * src/lib/setup.ts; the hub decides when to mount this). The hub also
 * reopens it from Settings, prefilled, as a review.
 *
 * The business profile comes FIRST: the moment an account exists it is
 * asked for its business, and "Not now" is the way out — it ends the
 * tour the way Skip does, so the question is asked once. Continue on
 * that step writes the profile row right then (the hub's
 * onSaveProfile), and only advances once the write has landed; a reload
 * afterwards lands in the hub with the fields kept, because the row is
 * what "done" means. The hub resolves with the row that ACTUALLY landed
 * and the fields are reseeded from it: two devices can both be in the
 * tour on one new account, and if the other one's Continue won the
 * create-if-absent, this device now shows and holds ITS fields — so
 * Finish/Skip later hand up exactly what is stored, the hub sees no
 * change, and a blank draft can never be upserted over a real row
 * (src/lib/supabase/profile.ts). Services go through the hub's own create handler
 * the moment each is saved, exactly like the Products page, so a
 * service typed here is a real catalog row and never a draft. The swipe
 * step is the landing page's playground — fixture rows, page-local
 * state, nothing persisted.
 *
 * Keyboard: every control is a real <button>, inputs are labelled by
 * htmlFor, and focus lands on the step heading whenever the step changes
 * (tabIndex -1 + focus() — no state is set in that effect). On the
 * services step, opening a form focuses its name field and closing one
 * (Save or Cancel) refocuses the heading — focus never drops to <body>.
 * A FAILED write puts focus back on the button that was pressed —
 * Continue, Not now / Skip, or Finish (the browser blurred it the moment
 * `saving` disabled it), so a keyboard user can retry without tabbing
 * from the top of the page. Enter in any of the three business fields
 * is Continue, as on the sign-in gate.
 */

const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-neutral-500";
const primaryClass =
  "h-11 w-full rounded-lg bg-foreground px-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40";
const secondaryClass =
  "h-11 flex-1 rounded-lg border border-neutral-300 px-4 text-base font-medium hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-600 dark:hover:bg-neutral-900";

const TITLE_KEYS = {
  business: "setup.businessTitle",
  services: "setup.servicesTitle",
  try: "setup.tryTitle",
  done: "setup.doneTitle",
} as const satisfies Record<SetupStep, string>;

export default function SetupWizard({
  profile,
  services,
  onCreateService,
  onUpdateService,
  onSaveProfile,
  onFinish,
  onSkip,
  saving,
  review,
}: {
  /** Seeds the business fields: EMPTY on first use, the stored row in
   *  review. After Continue the fields are reseeded from what
   *  onSaveProfile resolves, not from this prop. */
  profile: BusinessProfile;
  services: Service[];
  /** The hub's Products create handler — a service saved here IS a row. */
  onCreateService: (service: Service) => void;
  /** The hub's Products update handler — a card here opens the same
   *  form on tap, so a typo or a wrong price is fixed where it was typed. */
  onUpdateService: (service: Service) => void;
  /** Continue on the business step: the hub writes the profile row NOW
   *  and resolves with the row that actually landed (another device's
   *  fields if its create won), or null on a failed write — the hub
   *  shows its alert, the fields stay typed, Continue can be tried
   *  again. The step advances only on a row. */
  onSaveProfile: (profile: BusinessProfile) => Promise<BusinessProfile | null>;
  /** "Go to my books" on the last step. Resolves like onSaveProfile
   *  (the row, or null on a failed write) — the tour has ended when it
   *  resolves with a row. */
  onFinish: (profile: BusinessProfile) => Promise<BusinessProfile | null>;
  /** "Not now" on the business step and "Skip for now" on the others —
   *  ends the tour, saving whatever was typed so far. Same resolution. */
  onSkip: (profile: BusinessProfile) => Promise<BusinessProfile | null>;
  /** The hub is writing the profile row; buttons wait so a double tap
   *  can't queue two writes, and a failed write leaves the step as is. */
  saving: boolean;
  /** Reopened from Settings: there is no setup to skip, so the exit
   *  link reads "Close" (same handler — writes only if a field changed). */
  review: boolean;
}) {
  const { t } = useLocale();
  const [index, setIndex] = useState(0);
  const step: SetupStep = SETUP_STEPS[index];
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [usState, setUsState] = useState(profile.usState);
  /** Which button is waiting on the hub's write: only THAT one reads
   *  "Saving…" — the others are not saving anything, and two stacked
   *  "Saving…" labels would say they are. It is also the button a
   *  failed write hands focus back to. */
  const [pressed, setPressed] = useState<"continue" | "exit" | "finish">("continue");
  /** Bumped on every failed write; the effect below refocuses the
   *  pressed button once it is enabled again. */
  const [saveFailures, setSaveFailures] = useState(0);
  const [addingService, setAddingService] = useState(false);
  /** The service whose card was tapped — its EditForm replaces the list's
   *  "Add a service" button under the same nav-hiding rule. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const serviceFormOpen = addingService || editingId !== null;

  // Focus follows the step: a screen-reader user hears the new title
  // instead of the button they just pressed vanishing under them.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // A failed write: the pressed button was `disabled` while the hub
  // wrote (browsers blur it right then), and the step did not change, so
  // nothing refocused the heading — document.activeElement is <body>.
  // Focus goes back to that button AFTER the render that re-enables it
  // (a disabled button refuses focus), which is why this is an effect
  // and not a line in the handler; it sets no state.
  const continueRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (saveFailures === 0) return;
    const target =
      pressed === "continue" ? continueRef : pressed === "exit" ? exitRef : finishRef;
    target.current?.focus();
  }, [saveFailures, pressed]);

  /** The exit (Not now / Skip / Close) and Finish both end the tour
   *  through the hub; a null resolution is a failed write, and the
   *  button that was pressed gets focus back. */
  const endWith = (
    which: "exit" | "finish",
    handler: (profile: BusinessProfile) => Promise<BusinessProfile | null>,
  ) => {
    if (saving) return;
    setPressed(which);
    void handler(draft()).then((stored) => {
      if (!stored) setSaveFailures((n) => n + 1);
    });
  };

  /** A service form closes (Save or Cancel unmounts the focused button):
   *  focus goes back to the step heading, not to <body>. Event handlers,
   *  not an effect. */
  const closeServiceForm = () => {
    setAddingService(false);
    setEditingId(null);
    headingRef.current?.focus();
  };

  /** Same trimming and uppercasing as the Settings form — one profile shape. */
  const draft = (): BusinessProfile => ({
    businessName: businessName.trim(),
    ownerName: ownerName.trim(),
    usState: usState.trim().toUpperCase(),
  });

  const next = () => setIndex((i) => Math.min(i + 1, SETUP_STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  /** Business step's Continue: the row is written first, then the step
   *  moves on — never the other way round, so what the person typed is
   *  never a draft the next screen could lose. The fields are reseeded
   *  from the row the hub says landed: from here on draft() IS the
   *  stored profile, so Finish/Skip have nothing to write and the tour's
   *  only first-use write stays the create-if-absent one. */
  const saveAndContinue = () => {
    if (saving) return;
    setPressed("continue");
    void onSaveProfile(draft()).then((stored) => {
      if (stored) {
        setBusinessName(stored.businessName);
        setOwnerName(stored.ownerName);
        setUsState(stored.usState);
        next();
      } else {
        setSaveFailures((n) => n + 1);
      }
    });
  };

  /** Enter in a business field is Continue — the sign-in gate one screen
   *  earlier submits on Enter, and bare inputs that swallow it read as a
   *  broken button. */
  const enterContinues = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveAndContinue();
    }
  };

  let body: React.ReactNode;
  switch (step) {
    case "business":
      body = (
        <div className="space-y-3">
          <p className="text-sm text-neutral-500">{t("setup.businessIntro")}</p>
          <div>
            <label className={labelClass} htmlFor="setup-biz-name">
              {t("settings.businessName")}
            </label>
            <input
              id="setup-biz-name"
              className={fieldClass}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onKeyDown={enterContinues}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="setup-biz-owner">
              {t("settings.ownerName")}
            </label>
            <input
              id="setup-biz-owner"
              className={fieldClass}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              onKeyDown={enterContinues}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="setup-biz-state">
              {t("settings.state")}
            </label>
            <input
              id="setup-biz-state"
              className={`${fieldClass} w-24 text-center uppercase`}
              placeholder="FL"
              maxLength={2}
              value={usState}
              onChange={(e) => setUsState(e.target.value)}
              onKeyDown={enterContinues}
            />
          </div>
        </div>
      );
      break;
    case "services":
      body = (
        <div className="space-y-3">
          <p className="text-sm text-neutral-500">{t("setup.servicesIntro")}</p>
          {services.length === 0 && !addingService && (
            <p className="text-sm text-neutral-500">{t("setup.noServicesYet")}</p>
          )}
          {/* Tap a card to edit it — the same form Products opens. While
              one is being edited, its card gives way to the form (as on
              Products, one form at a time). */}
          {services.map((service) =>
            service.id === editingId ? (
              <EditForm
                key={service.id}
                initial={service}
                services={services}
                autoFocusName
                onSave={(next) => {
                  onUpdateService(next);
                  closeServiceForm();
                }}
                onCancel={closeServiceForm}
              />
            ) : (
              <ProductCard
                key={service.id}
                service={service}
                onTap={serviceFormOpen ? undefined : () => setEditingId(service.id)}
              />
            ),
          )}
          {addingService ? (
            <EditForm
              initial={null}
              services={services}
              // "Add a service" unmounts itself to mount this form:
              // focus goes into the name field, not to <body>.
              autoFocusName
              onSave={(service) => {
                onCreateService(service);
                closeServiceForm();
              }}
              onCancel={closeServiceForm}
            />
          ) : (
            editingId === null && (
              <button
                type="button"
                className="w-full rounded-xl border border-neutral-400 px-4 py-4 text-base font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-900"
                onClick={() => setAddingService(true)}
              >
                {t("setup.addService")}
              </button>
            )
          )}
        </div>
      );
      break;
    case "try":
      // The playground's own caption carries the practice line — one
      // caption, not two saying the same thing around the deck.
      body = (
        <SwipePlayground
          insightsBelow={false}
          label={t("setup.tryCaption")}
          resetLabel={t("setup.tryReset")}
        />
      );
      break;
    case "done":
      body = (
        <div className="space-y-4">
          <p className="text-sm">{t("setup.doneIntro")}</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            <li>{t("setup.done1")}</li>
            <li>{t("setup.done2")}</li>
            <li>{t("setup.done3")}</li>
          </ul>
          <p className="text-xs text-neutral-500">{t("setup.doneAgain")}</p>
        </div>
      );
      break;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {t(review ? "setup.headerReview" : "setup.header")}
        </h2>
        {/* The step count rides INSIDE the focused heading as hidden
            text: focus lands here on every step change, so "Step 2 of 4"
            is spoken with the title. A label on the dots' container was
            never reached — an aria-hidden-only group has nothing to
            read, so screen readers skip it. */}
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-base font-semibold focus:outline-none"
        >
          {t(TITLE_KEYS[step])}
          <span className="sr-only">
            {", "}
            {t("setup.stepOf", { current: index + 1, total: SETUP_STEPS.length })}
          </span>
        </h3>
        {/* One dot per SETUP_STEPS entry, the current one in the
            foreground color — purely visual; the heading above carries
            the count. */}
        <div aria-hidden="true" className="flex gap-2">
          {SETUP_STEPS.map((name, i) => (
            <span
              key={name}
              className={`h-2 w-2 rounded-full ${
                i === index ? "bg-foreground" : "bg-neutral-300 dark:bg-neutral-700"
              }`}
            />
          ))}
        </div>
      </div>

      {body}

      {/* While a service form is open (new or editing a card) its own
          Save/Cancel are the only exits (as on the Products page): Back,
          Continue and Skip would unmount the form and vaporize a
          half-typed name and price. */}
      {step === "services" && serviceFormOpen ? null : (
        <div className="space-y-3">
          {step === "business" && (
            // The first screen has no Back: there is nothing before it.
            // Continue writes the row (the hub's alert reports a failed
            // write); "Not now" below ends the tour instead.
            <button
              ref={continueRef}
              type="button"
              className={primaryClass}
              disabled={saving}
              onClick={saveAndContinue}
            >
              {saving && pressed === "continue" ? t("setup.saving") : t("setup.continue")}
            </button>
          )}
          {(step === "services" || step === "try") && (
            <div className="flex gap-2">
              <button type="button" className={secondaryClass} onClick={back}>
                {t("setup.back")}
              </button>
              <button
                type="button"
                className="h-11 flex-1 rounded-lg bg-foreground px-4 text-base font-medium text-background hover:opacity-90"
                onClick={next}
              >
                {t("setup.continue")}
              </button>
            </div>
          )}
          {step === "done" && (
            <div className="flex gap-2">
              <button type="button" className={secondaryClass} disabled={saving} onClick={back}>
                {t("setup.back")}
              </button>
              <button
                ref={finishRef}
                type="button"
                className="h-11 flex-1 rounded-lg bg-foreground px-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
                disabled={saving}
                onClick={() => endWith("finish", onFinish)}
              >
                {saving && pressed === "finish" ? t("setup.saving") : t("setup.finish")}
              </button>
            </div>
          )}
          {step !== "done" && (
            // The business step says "Not now" (no profile today, straight
            // to the books); the later steps say "Skip for now". Same
            // handler, same meaning: the tour ends. A review just closes.
            <button
              ref={exitRef}
              type="button"
              className="h-11 w-full text-sm text-neutral-500 hover:underline disabled:opacity-40"
              disabled={saving}
              onClick={() => endWith("exit", onSkip)}
            >
              {saving && pressed === "exit"
                ? t("setup.saving")
                : review
                  ? t("setup.close")
                  : step === "business"
                    ? t("setup.notNow")
                    : t("setup.skip")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
