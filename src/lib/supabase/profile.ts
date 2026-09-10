import { getSupabase } from "./client";
import type { BusinessProfile } from "@/lib/profile";

type Row = {
  business_name: string;
  owner_name: string;
  us_state: string;
};

/**
 * null = the account has NO business_profiles row yet. Callers map that
 * to EMPTY_PROFILE for the form and keep the distinction for the welcome
 * tour, whose "done" marker is the row itself (src/lib/profile.ts).
 * Unconfigured (no Supabase) reads as "no row" too — nothing there can
 * ever hold one.
 */
export const loadProfile = async (): Promise<BusinessProfile | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("business_profiles")
    .select("business_name, owner_name, us_state")
    .maybeSingle<Row>();
  // A FAILED check must not impersonate "no profile yet": the caller
  // seeds the Settings form from this, and saving blank seeds over a
  // real profile would wipe it (review catch). Throw; the caller keeps
  // the form gated until a load actually succeeds.
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    businessName: typeof data.business_name === "string" ? data.business_name : "",
    ownerName: typeof data.owner_name === "string" ? data.owner_name : "",
    usState: typeof data.us_state === "string" ? data.us_state : "",
  };
};

export const saveProfile = async (
  profile: BusinessProfile,
  accountId: string,
): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("business_profiles").upsert({
    account_id: accountId,
    business_name: profile.businessName,
    owner_name: profile.ownerName,
    us_state: profile.usState,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
};
