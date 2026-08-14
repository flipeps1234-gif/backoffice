/**
 * The frequency cap — a HARD RULE, not a tuning knob: at most one
 * owed_aging alert per client per week. Nagging a customer's phone is
 * how a small business loses the customer; the cap is the product
 * protecting the owner from the tool.
 */

export const OWED_ALERT_CAP_DAYS = 7;

/**
 * `lastSentAt` = the newest owed_aging row for this client with status
 * NOT failed/skipped (a failed send didn't reach anyone and doesn't
 * spend the budget). ISO timestamps, `now` injected — src/lib has no
 * clock.
 */
export const canSendOwedAlert = (
  lastSentAt: string | null,
  now: string,
): boolean => {
  if (lastSentAt === null) return true;
  const elapsed = Date.parse(now) - Date.parse(lastSentAt);
  return elapsed >= OWED_ALERT_CAP_DAYS * 86_400_000;
};
