/**
 * Which calendar day "today" is for the person uploading.
 *
 * The extract route runs on Vercel, whose clock is UTC — and from late
 * afternoon until midnight anywhere in the Americas, UTC is already
 * tomorrow. The model resolves "Today", "Yesterday", weekday names and
 * year-less dates against whatever day we tell it, and the row it dates is
 * saved before the user confirms, with no flag (the amber ring measures
 * how well the label was READ, and "Today" reads perfectly). Every other
 * date stamp in the app already uses the device's LOCAL calendar day
 * (upload-screen's localToday, the numpad, new-sale); this was the one
 * computed server-side. So the client sends its IANA zone and its own local
 * date, and this picks the trustworthy one:
 *
 *   1. the device's zone applied to the SERVER clock — a phone's clock can
 *      be wrong, its zone almost never is;
 *   2. the device's own date, when it is a real calendar date within two
 *      days of the server's — a skewed clock must not write arbitrary years;
 *   3. the UTC slice — the old behavior, and what a client that sends
 *      neither (the native app, until it is updated) still gets.
 *
 * Accepted, not solved here: "Today" in a screenshot means the day it was
 * CAPTURED. A Monday-night screenshot uploaded Wednesday is still dated
 * Wednesday; fixing that needs a per-file capture date from the client.
 */

export type TodayHints = {
  today?: string | null;
  timeZone?: string | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD and a real calendar date (same rule as validate.ts). */
const isRealIsoDate = (text: string): boolean => {
  if (!ISO_DATE.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
};

/** The calendar date of `now` in an IANA zone, or null when the runtime
 *  does not know the zone (Intl throws a RangeError). en-CA formats as
 *  YYYY-MM-DD. */
const dateInZone = (now: Date, timeZone: string): string | null => {
  try {
    const text = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return isRealIsoDate(text) ? text : null;
  } catch {
    return null;
  }
};

const daysApart = (a: string, b: string): number =>
  Math.abs(
    (new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) /
      86_400_000,
  );

export const resolveToday = (hints: TodayHints, now: Date = new Date()): string => {
  const utc = now.toISOString().slice(0, 10);
  if (hints.timeZone) {
    const zoned = dateInZone(now, hints.timeZone);
    if (zoned) return zoned;
  }
  const client = hints.today ?? "";
  if (isRealIsoDate(client) && daysApart(client, utc) <= 2) return client;
  return utc;
};

/** "Wednesday" for a YYYY-MM-DD, computed in UTC so the server's own zone
 *  never enters it. Given to the model because it resolves "Tuesday" by
 *  counting back from today, and models miscount weekday-from-date. */
export const weekdayOf = (isoDate: string): string =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
