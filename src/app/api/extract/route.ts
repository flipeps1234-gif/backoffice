import { activeProviderName, extract } from "@/lib/extract";
import type { ExtractionInput } from "@/lib/extract";
import { IMAGE_TYPES } from "@/lib/extract/image-types";
import {
  isDemoAccount,
  isSupabaseConfigured,
  verifyAccessToken,
} from "@/lib/supabase/server";

/**
 * Extraction runs here, not in the browser. When a real provider is plugged
 * in its API key stays on the server.
 *
 * This is a PUBLIC Vercel endpoint — every file under app/api is. The paid
 * provider path therefore requires a signed-in caller: anonymous requests
 * (including demo mode) only ever reach the free deterministic mock, so a
 * stranger with curl cannot spend the owner's OpenAI budget.
 */

const MAX_FILES = 20;
// Vercel rejects request bodies over 4.5MB before this code runs, so a
// bigger per-file limit would be a lie. The client compresses before
// uploading; a file this large here is an undecodable original (rare HEIC).
const MAX_BYTES = 4 * 1024 * 1024;


/**
 * Cheap per-IP brake: N requests per window, in memory. Per-instance only —
 * a determined attacker can rotate IPs or hit fresh instances, so the auth
 * check above is the real gate; this just blunts casual abuse.
 */
const WINDOW_MS = 60_000;
// Uploads arrive in chunks now (several requests per selection), so the
// brake sits higher — auth is the real gate on the paid path.
const MAX_PER_WINDOW = 30;
const hits = new Map<string, { count: number; windowStart: number }>();

const rateLimited = (ip: string): boolean => {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    // Stop the map growing forever; stale windows are meaningless anyway.
    if (hits.size > 10_000) hits.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
};

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Too many uploads at once. Give it a minute." },
      { status: 429 },
    );
  }

  // formData() throws outright when the body isn't multipart.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected an upload." }, { status: 400 });
  }

  const files = form.getAll("screenshots").filter((f) => f instanceof File);

  if (files.length === 0) {
    return Response.json({ error: "No screenshots uploaded." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return Response.json(
      { error: `That's more than ${MAX_FILES} screenshots at once.` },
      { status: 400 },
    );
  }

  const inputs: ExtractionInput[] = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: `${file.name} is too large even after compression. Try a screenshot of it instead.` },
        { status: 400 },
      );
    }
    if (!IMAGE_TYPES.has(file.type)) {
      return Response.json(
        { error: `${file.name} isn't a supported image (PNG, JPEG, WebP, GIF).` },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    inputs.push({
      kind: "image",
      mediaType: file.type,
      base64: bytes.toString("base64"),
      filename: file.name,
    });
  }

  // Who pays decides who may call — and, just as important, NOBODY gets the
  // mock by accident. The mock invents plausible payers, $20–$200 amounts and
  // 0.95–0.99 confidences, which is below the sheet's amber-flag threshold. In
  // a ledger, quietly answering a real request with invented rows is worse
  // than any error: the user confirms them, they are written to Postgres
  // before the swipe, nothing can delete them, and they flow on into the
  // insights, the dashboard and the CSV that goes to a tax preparer.
  //
  // So the mock runs only when it was ASKED for, never as a fallback.
  // The rule, stated once: where accounts exist, the ONLY caller who may
  // receive the mock is the demo account. Not a missing key, not a stray
  // EXTRACT_PROVIDER=mock, not a broken session.
  const provider = activeProviderName();

  if (isSupabaseConfigured) {
    const token =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
    // With Supabase configured the UI cannot reach this without a session —
    // UploadScreen renders SignIn instead. So a tokenless request is a broken
    // session or a direct call, and previously both were answered with
    // fabricated rows and a 200.
    if (!token) {
      return Response.json(
        { error: "Sign in again and retry." },
        { status: 401 },
      );
    }
    const verified = await verifyAccessToken(token);
    if (!verified) {
      return Response.json(
        { error: "Your session expired. Sign in again and retry." },
        { status: 401 },
      );
    }
    // The shared tester account gets the REAL provider — an accepted,
    // deliberately bounded cost: the owner caps spend on the OpenAI side,
    // and anyone who types the demo word draws from that cap. Setting
    // DEMO_EXTRACTION=mock in the environment flips tester back to the
    // free mock without a code change.
    if (isDemoAccount(verified.email) && process.env.DEMO_EXTRACTION === "mock") {
      return await run("mock");
    }

    // The demo branch above is the only way out with "mock". Reaching here
    // still holding it means OPENAI_API_KEY is missing, or someone set
    // EXTRACT_PROVIDER=mock against a real account system — either way this
    // is a real user, and inventing their financial records is not an option.
    if (provider === "mock") {
      console.error("Extraction unavailable: no usable provider configured.");
      return Response.json(
        {
          error:
            "Reading screenshots is unavailable right now. Nothing was read.",
        },
        { status: 503 },
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    // A production deploy with no Supabase has no way to authenticate anyone,
    // so serving the paid provider here would be a free OpenAI proxy on the
    // open internet, billed to the owner. Fail closed instead of open.
    return Response.json(
      { error: "This deployment isn't set up for uploads yet." },
      { status: 503 },
    );
  }

  // No account system at all — local dev. Whatever the env selected is fine;
  // there is no real user here and no ledger to corrupt.
  return await run(provider);

  /**
   * The single exit that actually reads images. Declared here so every path
   * above returns through one place — the demo branch included, which is the
   * one legitimate way to reach the mock with a verified token.
   */
  async function run(chosen: string) {
    try {
      const result = await extract(inputs, chosen);
      // The client checks this: a signed-in caller that somehow receives
      // "mock" refuses the rows rather than showing invented payments.
      return Response.json({ ...result, provider: chosen });
    } catch (cause) {
      // Never fail silently — log the real reason, show the user a usable one.
      console.error("Extraction failed:", cause);
      return Response.json(
        { error: "We couldn't read those right now. Try again in a moment." },
        { status: 502 },
      );
    }
  }
}
