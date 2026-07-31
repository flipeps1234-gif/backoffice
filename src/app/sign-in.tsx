"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Magic link: one field, no password to forget on a phone in a driveway.
 * Supabase emails a link; clicking it returns here already signed in.
 *
 * Typing the demo word instead signs into the shared TESTER account — a
 * real Supabase account with real saved data, no inbox round-trip. That
 * matters most in the home-screen app, where an emailed link opens in the
 * browser and can never sign in the installed copy.
 */
const DEMO_WORD = "tester";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function enterDemo() {
    const supabase = getSupabase();
    if (!supabase) return;

    setSending(true);
    setError("");

    try {
      // The server holds the tester credentials; the word is just the knock.
      const response = await fetch("/api/demo-session", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The test account couldn't sign in right now.");
        return;
      }
      // A real session: onAuthStateChange fires and the app opens signed in.
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) setError(sessionError.message);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (email.trim().toLowerCase() === DEMO_WORD) {
      await enterDemo();
      return;
    }

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
        {/* type=text, not email: the browser's own validation would reject
            the demo word before submit ever ran. Supabase still rejects
            malformed real addresses server-side. */}
        <input
          id="email"
          type="text"
          inputMode="email"
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
        {sending ? "Signing in…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
