import { sendWhatsAppTemplate, whatsappEnabled } from "@/lib/notify/whatsapp";
import { verifyAccessToken } from "@/lib/supabase/server";

/**
 * Dev-only exercise route for the notifications SPIKE — how the plumbing
 * gets tested against Meta's free test number without any product
 * surface sending anything.
 *
 * Triple-gated: refuses in production builds outright, refuses when the
 * channel env switch is off, and requires a signed-in caller (same
 * bearer pattern as /api/extract) so even on a dev tunnel it is not an
 * open relay.
 *
 *   curl -X POST localhost:3000/api/notify/test \
 *     -H "Authorization: Bearer <access token>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"to":"+15550001111","template":"owed_alert","lang":"en",
 *          "variables":["Rosa","Acme Cleaning","$120.00","Aug 1"]}'
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "not available in production" }, { status: 404 });
  }
  if (!whatsappEnabled()) {
    return Response.json(
      { error: "WHATSAPP_ENABLED is not true (the spike is dark)" },
      { status: 503 },
    );
  }

  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const verified = await verifyAccessToken(token);
  if (!verified) {
    return Response.json({ error: "sign in first" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    to?: string;
    template?: string;
    lang?: string;
    variables?: string[];
  } | null;
  if (!body?.to || !body.template) {
    return Response.json({ error: "need to + template" }, { status: 400 });
  }

  const result = await sendWhatsAppTemplate(
    body.to,
    body.template,
    body.variables ?? [],
    body.lang ?? "en",
  );
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
