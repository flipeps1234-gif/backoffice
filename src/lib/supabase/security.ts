import "server-only";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// This client deliberately does not inherit a browser session. Its RPCs
// accept only server-verified identities and never return ledger data.
export const securityClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        signal: AbortSignal.timeout(5_000),
      }),
    },
  });
};

export const signupIpHash = (ip: string): string => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Signup protection is not configured.");
  return createHmac("sha256", key).update(`contado:founding-ip:v1:${ip}`).digest("hex");
};

type Reservation =
  | { allowed: true; reservation_id: string }
  | { allowed: false; retry_after: number };

export async function reserveExtraction(accountId: string, images: number): Promise<Reservation> {
  const db = securityClient();
  if (!db) throw new Error("Upload protection is not configured.");
  const { data, error } = await db.rpc("reserve_extraction", {
    p_account_id: accountId,
    p_images: images,
  });
  if (error) throw new Error(`Upload reservation failed (${error.code}).`);
  // A missing/stale migration must fail closed, not invoke the provider.
  if (data?.allowed === true && typeof data.reservation_id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.reservation_id)) {
    return { allowed: true, reservation_id: data.reservation_id };
  }
  if (data?.allowed === false && Number.isInteger(data.retry_after) && data.retry_after > 0) {
    return { allowed: false, retry_after: data.retry_after };
  }
  throw new Error("Invalid upload reservation response.");
}

export async function finishExtraction(reservationId: string): Promise<void> {
  try {
    const db = securityClient();
    if (!db) return;
    const { error } = await db.rpc("finish_extraction", { p_reservation_id: reservationId });
    if (error) console.error("Upload lease release failed:", error.code);
  } catch {
    // The 120-second database lease releases even if this instance dies.
    // Never lose successfully extracted rows because cleanup failed.
    console.error("Upload lease release unavailable.");
  }
}
