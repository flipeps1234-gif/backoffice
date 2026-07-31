import { activeProviderName, extract } from "@/lib/extract";
import type { ExtractionInput } from "@/lib/extract";
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
const MAX_BYTES = 8 * 1024 * 1024;

/** What OpenAI's vision endpoint accepts. Anything else is refused early. */
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/**
 * Cheap per-IP brake: N requests per window, in memory. Per-instance only —
 * a determined attacker can rotate IPs or hit fresh instances, so the auth
 * check above is the real gate; this just blunts casual abuse.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
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
        { error: `${file.name} is larger than 8MB.` },
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

  // Who pays decides who may call. The paid provider requires a signed-in
  // user whenever accounts exist. No token at all means demo or a signed-out
  // tab — they get the free mock, which is what demo expects. A token that
  // FAILS verification is different: that's a signed-in user whose session
  // broke, and silently feeding them plausible fake rows would be worse than
  // an error, so they get a 401 and the client re-auths. Without Supabase
  // there is no way to authenticate, so local dev keeps whatever env selects.
  let provider = activeProviderName();
  if (provider !== "mock" && isSupabaseConfigured) {
    const token =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
    if (!token) {
      provider = "mock";
    } else {
      const verified = await verifyAccessToken(token);
      if (!verified) {
        return Response.json(
          { error: "Your session expired. Sign in again and retry." },
          { status: 401 },
        );
      }
      // The shared tester account is a real session anyone can mint via
      // /api/demo-session — letting it reach the paid provider would reopen
      // the exact spend-the-owner's-budget hole the token check closes.
      if (isDemoAccount(verified.email)) provider = "mock";
    }
  }

  try {
    const result = await extract(inputs, provider);
    return Response.json({ ...result, provider });
  } catch (cause) {
    // Never fail silently — log the real reason, show the user a usable one.
    console.error("Extraction failed:", cause);
    return Response.json(
      { error: "We couldn't read those right now. Try again in a moment." },
      { status: 502 },
    );
  }
}
