"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Magic link: one field, no password to forget on a phone in a driveway.
 * Supabase emails a link; clicking it returns here already signed in.
 */
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSending(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });

    setSending(false);
    if (signInError) setError(signInError.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Check your email</h2>
        <p className="text-sm text-neutral-500">
          We sent a sign-in link to {email}. Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div>
        <label
          className="mb-1 block text-xs font-medium text-neutral-500"
          htmlFor="email"
        >
          Your email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
      >
        {sending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
