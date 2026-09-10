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
 * The welcome tour — 2026-09-10. Five screens between sign-in and the
 * hub, once per account (the rule is src/lib/setup.ts; the hub decides
 * when to mount this). The hub also reopens it from Settings, prefilled,
 * as a review.
 *
 * What is saved, and when: the business fields live in THIS component's
 * state until the tour ends — Finish and Skip both hand them up, and the
 * hub writes the profile row then (a reload mid-tour restarts it; nothing
 * was lost because nothing was written). Services are the exception on
 * purpose: each one goes through the hub's own create handler the moment
 * it is saved, exactly like the Products page, so a service typed here
 * is a real catalog row and never a draft. The swipe step is the landing
 * page's playground — fixture rows, page-local state, nothing persisted.
 *
 * Keyboard: every control is a real <button>, inputs are labelled by
 * htmlFor, and focus lands on the step heading whenever the step changes
 * (tabIndex -1 + focus() — no state is set in that effect).
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
  welcome: "setup.welcomeTitle",
  business: "setup.businessTitle",
  services: "setup.servicesTitle",
  try: "setup.tryTitle",
  done: "setup.doneTitle",
} as const satisfies Record<SetupStep, string>;

export default function SetupWizard({
  profile,
  services,
  onCreateService,
  onFinish,
  onSkip,
  saving,
  review,
}: {
  /** Seeds the business fields: EMPTY on first use, the stored row in review. */
  profile: BusinessProfile;
  services: Service[];
  /** The hub's Products create handler — a service saved here IS a row. */
  onCreateService: (service: Service) => void;
  /** "Go to my books" on the last step. */
  onFinish: (profile: BusinessProfile) => void;
  /** "Skip for now" on any other step — saves whatever was typed so far. */
  onSkip: (profile: BusinessProfile) => void;
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
  const [addingService, setAddingService] = useState(false);

  // Focus follows the step: a screen-reader user hears the new title
  // instead of the button they just pressed vanishing under them.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  /** Same trimming and uppercasing as the Settings form — one profile shape. */
  const draft = (): BusinessProfile => ({
    businessName: businessName.trim(),
    ownerName: ownerName.trim(),
    usState: usState.trim().toUpperCase(),
  });

  const next = () => setIndex((i) => Math.min(i + 1, SETUP_STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  let body: React.ReactNode;
  switch (step) {
    case "welcome":
      body = (
        <div className="space-y-4">
          <p className="text-base font-semibold">{t("setup.welcomeHeadline")}</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            <li>{t("setup.welcome1")}</li>
            <li>{t("setup.welcome2")}</li>
            <li>{t("setup.welcome3")}</li>
          </ol>
        </div>
      );
      break;
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
          {services.map((service) => (
            <ProductCard key={service.id} service={service} />
          ))}
          {addingService ? (
            <EditForm
              initial={null}
              services={services}
              onSave={(service) => {
                onCreateService(service);
                setAddingService(false);
              }}
              onCancel={() => setAddingService(false)}
            />
          ) : (
            <button
              type="button"
              className="w-full rounded-xl border border-neutral-400 px-4 py-4 text-base font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-900"
              onClick={() => setAddingService(true)}
            >
              {t("setup.addService")}
            </button>
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
        <h2 className="text-lg font-semibold tracking-tight">{t("setup.header")}</h2>
        {/* The step count rides INSIDE the focused heading as hidden
            text: focus lands here on every step change, so "Step 2 of 5"
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
        {/* Five dots, the current one in the foreground color — purely
            visual; the heading above carries the count. */}
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

      {/* While a service form is open its own Save/Cancel are the only
          exits (as on the Products page): Back, Continue and Skip would
          unmount the form and vaporize a half-typed name and price. */}
      {step === "services" && addingService ? null : (
        <div className="space-y-3">
          {step === "welcome" && (
            <button type="button" className={primaryClass} onClick={next}>
              {t("setup.start")}
            </button>
          )}
          {(step === "business" || step === "services" || step === "try") && (
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
                type="button"
                className="h-11 flex-1 rounded-lg bg-foreground px-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
                disabled={saving}
                onClick={() => onFinish(draft())}
              >
                {saving ? t("setup.saving") : t("setup.finish")}
              </button>
            </div>
          )}
          {step !== "done" && (
            <button
              type="button"
              className="h-11 w-full text-sm text-neutral-500 hover:underline disabled:opacity-40"
              disabled={saving}
              onClick={() => onSkip(draft())}
            >
              {saving ? t("setup.saving") : review ? t("setup.close") : t("setup.skip")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
