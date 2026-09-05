import { securityClient } from "@/lib/supabase/security";
import { isDemoAccount, verifyAccessToken } from "@/lib/supabase/server";

/**
 * The owner's analytics feed for /app/admin. A PUBLIC Vercel endpoint like
 * every file under app/api, so it is gated three times before it reads
 * anything: a valid session token (401), the route being configured at all
 * (503), and the session's email being on OWNER_EMAILS (403). Only then
 * does the server-only client call public.admin_overview() (migration
 * 0023) — a SECURITY DEFINER function executable by service_role alone,
 * which is how one caller can see across every account's RLS.
 *
 * The shared demo account can never be the owner, whatever the env says:
 * anyone who types the demo word holds a real tester session.
 *
 * Order matters for what a stranger learns: an unauthenticated probe gets
 * 401 whether or not the feature exists; a signed-in non-owner gets 403
 * only once the feature is configured, 503 before — the same answer as
 * any other dark route.
 */

export const dynamic = "force-dynamic";

/** OWNER_EMAILS: comma- or space-separated, case-insensitive. */
export const ownerEmails = (): Set<string> =>
  new Set(
    (process.env.OWNER_EMAILS ?? "")
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );

export async function GET(request: Request) {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const verified = await verifyAccessToken(token);
  if (!verified) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const owners = ownerEmails();
  const db = securityClient();
  if (owners.size === 0 || !db) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const email = verified.email?.toLowerCase() ?? "";
  if (!email || isDemoAccount(email) || !owners.has(email)) {
    return Response.json({ error: "Not for this account." }, { status: 403 });
  }

  const { data, error } = await db.rpc("admin_overview");
  if (error || !data || typeof data !== "object") {
    // The code, never the message: a stale migration (PGRST202 / 42883)
    // is diagnosable from the Vercel log without echoing internals.
    console.error("admin_overview failed:", error?.code ?? "empty");
    return Response.json({ error: "Try again later." }, { status: 503 });
  }

  return Response.json(data, {
    headers: {
      // The owner's numbers, never cached anywhere between the DB and them.
      "Cache-Control": "no-store, private",
    },
  });
}
