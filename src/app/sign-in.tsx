"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Sign in with an emailed magic link. Sessions persist on the device, so this
 * happens once per device, not per visit.
 *
 * We tried a typed 6-digit code instead, because a link always opens in the
 * browser and so can never sign in an installed home-screen app. It was
 * reverted: the email body is decided by Supabase's template, not by this
 * code — signInWithOtp sends whatever the template renders. Emitting a code
 * needs {{ .Token }} in the Magic Link AND Confirm signup templates, and
 * editing those needs a custom SMTP provider. Until that exists, asking the
 * user to type a code that never arrives is worse than a link that works.
 * The home-screen-app caveat below is the price, and it is real.
 *
 * Typing the demo word instead signs into the shared TESTER account — a
 * real Supabase account with real saved data, no inbox round-trip.
 */
const DEMO_WORD = "tester";

/**
 * Supabase hands back the browser's own network error verbatim, and the
 * browser's wording depends on which browser you're in: Safari says "Load
 * failed", Chrome says "Failed to fetch", Firefox says "NetworkError when
 * attempting to fetch resource". We were printing whichever one arrived
 * straight onto the sign-in screen, where it means nothing to anyone.
 *
 * They all mean the same thing — the request never reached a server — and
 * that has exactly two causes worth telling a user apart: their connection,
 * or ours. Since we can't tell which from here, say both, and say the second
 * one plainly rather than leaving them retyping an email that was never the
 * problem. The raw error still goes to the console for whoever is debugging.
 *
 * Exported so the mapping can be checked without a browser.
 */
export const humanAuthError = (raw: string): string => {
  const unreachable =
    /failed to fetch|load failed|networkerror|fetch failed|network request failed/i.test(
      raw,
    );
  if (unreachable) {
    return (
      "Couldn't reach the server. Check your connection and try again — " +
      "if it keeps failing, it's us, not you."
    );
  }
  // Supabase's own messages (rate limits, malformed address) are already
  // written for humans, so they pass through untouched.
  return raw || "Something went wrong. Try again in a moment.";
};

export default function SignIn() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  async function enterDemo() {
    const supabase = getSupabase();
    if (!supabase) return;

    setBusy(true);
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
      // Same treatment as sendLink — setSession does its own network call,
      // so it can fail the same way and used to print the same raw string.
      if (sessionError) {
        console.error("Demo sign-in failed:", sessionError);
        setError(humanAuthError(sessionError.message));
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendLink() {
    const supabase = getSupabase();
    if (!supabase) return;

    setBusy(true);
    setError("");

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Where the link lands. Must also be listed under Supabase →
        // Authentication → URL Configuration → Redirect URLs, or the link
        // bounces to the site URL and the session never arrives.
        emailRedirectTo: window.location.origin,
      },
    });

    setBusy(false);
    if (sendError) {
      console.error("Sign-in request failed:", sendError);
      setError(humanAuthError(sendError.message));
      return;
    }
    setSent(true);
  }

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    if (email.trim().toLowerCase() === DEMO_WORD) {
      await enterDemo();
      return;
    }
    setResent(false);
    await sendLink();
  }

  async function resend() {
    setResent(true);
    await sendLink();
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Check your email</h2>
          <p className="mt-1 text-sm text-neutral-500">
            We sent a sign-in link to {email.trim()}. Open it{" "}
            <strong className="font-medium text-foreground">
              on this device
            </strong>{" "}
            — the link signs in whichever browser opens it.
          </p>
        </div>

        {resent && !error && (
          <p aria-live="polite" className="text-sm text-emerald-700 dark:text-emerald-400">
            New link sent.
          </p>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </p>
        )}

        <p className="text-sm text-neutral-500">
          Nothing yet? Give it a minute, then check spam.
        </p>

        <div className="flex justify-between text-sm text-neutral-500">
          <button
            type="button"
            className="hover:underline"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setError("");
              setResent(false);
            }}
          >
            Different email
          </button>
          <button
            type="button"
            className="hover:underline"
            disabled={busy}
            onClick={resend}
          >
            {busy ? "Sending…" : "Resend link"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submitEmail}>
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
        disabled={busy}
        className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
