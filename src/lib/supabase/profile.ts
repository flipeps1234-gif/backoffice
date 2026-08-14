import { getSupabase } from "./client";
import { EMPTY_PROFILE, type BusinessProfile } from "@/lib/profile";

type Row = {
  business_name: string;
  owner_name: string;
  us_state: string;
};

export const loadProfile = async (): Promise<BusinessProfile> => {
  const supabase = getSupabase();
  if (!supabase) return EMPTY_PROFILE;

  const { data, error } = await supabase
    .from("business_profiles")
    .select("business_name, owner_name, us_state")
    .maybeSingle<Row>();
  if (error || !data) return EMPTY_PROFILE;
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
