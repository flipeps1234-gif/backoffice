"use client";

import { useSyncExternalStore } from "react";
import { acceptedVersion, subscribeToTerms, TERMS_VERSION } from "@/lib/terms";

/**
 * The one screen everybody sees before anything else — before sign-in, before
 * an email address is typed. It exists mainly for one sentence: the screenshots
 * you upload are sent to an AI service to be read, and they contain your
 * customers' names and what they paid. Nothing in the app said so before.
 *
 * Everything here describes what the code actually does today. When the code
 * changes — a delete button, images retained, a different provider — this
 * changes with it. A promise the code doesn't keep is worse than no promise.
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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Before you start
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Short, and worth reading once.
        </p>
      </div>

      <div className="space-y-5">
        <Term title="Your screenshots are sent to an AI service to be read">
          When you upload a screenshot or photograph, the image goes to OpenAI,
          which reads the text and returns the payments it found. That image
          usually contains your customers&apos; names, what they paid and when.
          It leaves your device. We keep the rows you confirm — not the images.
        </Term>

        <Term title="Check every row before you keep it">
          The reading is automatic and it gets things wrong. Amounts, names and
          dates are guesses until you confirm them. We flag what we&apos;re
          unsure about, but that flag is a guess too. What ends up in your books
          is your call.
        </Term>

        <Term title="This is a record, not an accountant">
          contado keeps track of money in and out. It does not give tax or
          financial advice and it does not file anything. The export is
          something you or your tax preparer work from, not a return.
        </Term>

        <Term title="Other people&apos;s information">
          Those screenshots are mostly other people&apos;s names and payments.
          Only upload what you&apos;re entitled to have.
        </Term>

        <Term title="Nothing can be deleted yet">
          The app has no delete button today. A payment you log stays in your
          ledger — you can correct it, but not remove it. Worth knowing before
          you log something you&apos;d rather not keep.
        </Term>

        <Term title="The test account is shared and public">
          Signing in with the demo word puts you in one account that everybody
          else testing the app also uses. They can see what you put there. Put
          nothing real in it.
        </Term>

        <Term title="Your data is yours">
          Export the lot as a spreadsheet whenever you like, free, always. We
          don&apos;t sell your data and there are no ads.
        </Term>

        <Term title="Early software, free hosting">
          It can be slow, unavailable, or lose a batch you haven&apos;t finished
          sorting. Keep your original screenshots until you&apos;ve checked the
          rows. Provided as-is, without warranty.
        </Term>
      </div>

      <button
        type="button"
        className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90"
        onClick={onAccept}
      >
        OK — I understand
      </button>

      <p className="text-xs text-neutral-500">
        Saved on this device, so you&apos;ll see this once. If any of it changes
        in a way that matters, we&apos;ll ask again. Version {TERMS_VERSION}.
      </p>
    </div>
  );
}
