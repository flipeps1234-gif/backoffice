"use client";

import { useLocale } from "./use-locale";

/**
 * The upload's progress, at a size you can read at arm's length while the
 * phone is in one hand — the old indicator was a line of grey 14px text.
 *
 * `fraction` of null means INDETERMINATE, and that is not laziness. A single
 * batch is one request to a vision model: we know when it started and when it
 * came back, and nothing in between. Animating a bar from 0 to 90% during that
 * would be inventing a number, which is the same sin as the rest of this
 * codebase works to avoid. So: a real fraction when there is real progress to
 * report, a moving stripe when there is not.
 */
export default function ProgressBar({
  label,
  detail,
  fraction,
}: {
  label: string;
  detail?: string;
  /** 0–1, or null when there is nothing measurable to report. */
  fraction: number | null;
}) {
  const { t } = useLocale();
  const pct = fraction === null ? null : Math.round(Math.min(1, Math.max(0, fraction)) * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      // Omitting aria-valuenow is how you say "indeterminate" to a screen
      // reader; a made-up number would be a lie there too.
      aria-valuenow={pct ?? undefined}
      aria-valuemin={pct === null ? undefined : 0}
      aria-valuemax={pct === null ? undefined : 100}
      aria-valuetext={pct === null ? t("shell.working") : `${pct}%`}
      className="space-y-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-medium">{label}</p>
        {pct !== null && (
          <p className="text-sm tabular-nums text-neutral-500">{pct}%</p>
        )}
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        {pct === null ? (
          <div className="progress-indeterminate h-full w-1/3 rounded-full bg-emerald-600" />
        ) : (
          <div
            className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      {detail && <p className="text-sm text-neutral-500">{detail}</p>}
    </div>
  );
}
