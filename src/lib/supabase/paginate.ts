/**
 * PostgREST caps every response at the project's `max-rows` setting — 1000 by
 * default on Supabase — and says NOTHING when it truncates. You just get a
 * short array back, with no error and no flag.
 *
 * That is unusually dangerous here. One loadTransactions() call feeds the
 * running totals, the history list, all three dashboard charts, and the CSV
 * the user hands their tax preparer. A silent cap means a tax document quietly
 * missing rows, and CLAUDE.md's permanent boundary is "never gate viewing or
 * exporting a user's own data". Depending on a server default for completeness
 * is exactly that gate, just an accidental one.
 *
 * So page explicitly rather than trusting the default.
 */

/** What we ASK for per request. The server may return fewer — see below. */
export const PAGE_SIZE = 1000;

/**
 * A page of rows, or an error. Matches the shape Supabase's client returns so
 * callers can hand their query builder straight in.
 */
export type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * Defence against a runaway loop burning the user's egress if a backend ever
 * ignores `range` and keeps returning the same page. 1000 pages is ~1M rows —
 * far past anything this product can legitimately produce.
 */
const MAX_PAGES = 1000;

/**
 * Read every row, one page at a time.
 *
 * The subtle part is the stride. We advance by the number of rows we RECEIVED,
 * not by the number we asked for: if a project's max-rows is set BELOW
 * PAGE_SIZE, asking for 0..999 returns (say) 500 rows, and striding by 1000
 * would skip rows 500..999 entirely — silently losing half the ledger while
 * looking like it worked. Striding by what actually arrived is correct for any
 * server cap, including one that changes between calls.
 *
 * Termination is an empty page rather than a short one, for the same reason: a
 * short page is ambiguous (cap? or the end?), an empty one is not. That costs
 * one extra round trip on an exact boundary, which is a fair price for never
 * silently truncating someone's tax export.
 */
export const loadAllPages = async <T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> => {
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await fetchPage(
      rows.length,
      rows.length + PAGE_SIZE - 1,
    );
    if (error) throw new Error(error.message);

    const received = data ?? [];
    if (received.length === 0) return rows;
    rows.push(...received);
  }

  throw new Error(
    `Stopped after ${MAX_PAGES} pages — the server kept returning rows. ` +
      `Your data is safe; this is a bug in the loader.`,
  );
};
