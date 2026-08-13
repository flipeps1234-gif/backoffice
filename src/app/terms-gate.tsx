"use client";

import { useSyncExternalStore } from "react";
import { acceptedVersion, subscribeToTerms, TERMS_VERSION } from "@/lib/terms";
import LocalePicker from "./locale-picker";
import { useLocale } from "./use-locale";

/**
 * The one screen everybody sees before anything else — before sign-in, before
 * an email address is typed. It exists mainly for one sentence: the screenshots
 * you upload are sent to an AI service to be read, and they contain your
 * customers' names and what they paid. Nothing in the app said so before.
 *
 * Everything here describes what the code actually does today. When the code
 * changes — a delete button, images retained, a different provider — this
 * changes with it. A promise the code doesn't keep is worse than no promise.
 *
 * The language picker sits at the top ON PURPOSE: this is the first screen,
 * and the person who needs the switcher most is the one who can't read the
 * language it happens to open in.
 */

/** undefined = storage not read yet (server render and first paint). */
export const useAcceptedTerms = (): string | null | undefined =>
  useSyncExternalStore(subscribeToTerms, acceptedVersion, () => undefined);

function Term({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {children}
      </p>
    </section>
  );
}

export default function TermsGate({ onAccept }: { onAccept: () => void }) {
  const { t } = useLocale();
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t("terms.title")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">{t("terms.subtitle")}</p>
        </div>
        <LocalePicker compact />
      </div>

      <div className="space-y-5">
        <Term title={t("terms.aiTitle")}>{t("terms.aiBody")}</Term>
        <Term title={t("terms.checkTitle")}>{t("terms.checkBody")}</Term>
        <Term title={t("terms.recordTitle")}>{t("terms.recordBody")}</Term>
        <Term title={t("terms.othersTitle")}>{t("terms.othersBody")}</Term>
        <Term title={t("terms.deleteTitle")}>{t("terms.deleteBody")}</Term>
        <Term title={t("terms.demoTitle")}>{t("terms.demoBody")}</Term>
        <Term title={t("terms.yoursTitle")}>{t("terms.yoursBody")}</Term>
        <Term title={t("terms.earlyTitle")}>{t("terms.earlyBody")}</Term>
      </div>

      <button
        type="button"
        className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90"
        onClick={onAccept}
      >
        {t("terms.accept")}
      </button>

      <p className="text-xs text-neutral-500">
        {t("terms.savedNote", { version: TERMS_VERSION })}
      </p>
    </div>
  );
}
