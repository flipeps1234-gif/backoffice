"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isConfigured } from "./client";

/**
 * Who's signed in. `loading` is true until we've asked Supabase, so the UI
 * doesn't flash the sign-in screen at someone who's already signed in.
 *
 * When Supabase isn't configured there is no account and no loading state —
 * the app runs in memory exactly as it did before v0.2.
 */
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // getSession reads the session stored ON THIS DEVICE — no network.
    // Signed in once means signed in on the next open, even offline or on
    // driveway signal. Every actual query is still validated server-side,
    // so a revoked session fails loudly at use, not silently at the gate.
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // Fires on sign-in, sign-out, and when the magic-link redirect lands.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { user, loading, isConfigured };
}
