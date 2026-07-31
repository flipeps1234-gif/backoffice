"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Sign in with a 6-digit emailed code, typed HERE — no link to click. A
 * magic link always opens in the browser, so it can never sign in the
 * installed home-screen app; a code works wherever it's typed. Sessions
 * persist on the device, so this happens once per device, not per visit.
 *
 * Typing the demo word instead signs into the shared TESTER account — a
 * real Supabase account with real saved data, no inbox round-trip.
 */
const DEMO_WORD = "tester";

export default function SignIn() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
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
      if (sessionError) setError(sessionError.message);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    const supabase = getSupabase();
    if (!supabase) return;

    setBusy(true);
    setError("");

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });

    setBusy(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setStep("code");
  }

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    if (email.trim().toLowerCase() === DEMO_WORD) {
      await enterDemo();
      return;
    }
    setResent(false);
    await sendCode();
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setBusy(true);
    setError("");

    // On success a session is set and onAuthStateChange opens the app.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    setBusy(false);
    if (verifyError) {
      setError(
        verifyError.message.toLowerCase().includes("expired") ||
          verifyError.message.toLowerCase().includes("invalid")
          ? "That code didn't match. Check the newest email, or resend."
          : verifyError.message,
      );
    }
  }

  async function resend() {
    setCode("");
    setResent(true);
    await sendCode();
  }

  if (step === "code") {
    return (
      <form className="space-y-4" onSubmit={submitCode}>
        <div>
          <h2 className="text-sm font-semibold">Check your email</h2>
          <p className="mt-1 text-sm text-neutral-500">
            We emailed a 6-digit code to {email.trim()}. Type it here.
          </p>
        </div>

        <input
          aria-label="6-digit code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-3 text-center text-2xl tracking-[0.5em] text-neutral-900 placeholder:text-neutral-300 placeholder:tracking-normal focus:border-neutral-900 focus:outline-none"
          placeholder="000000"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
        />

        {resent && !error && (
          <p aria-live="polite" className="text-sm text-emerald-600">
            New code sent.
          </p>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || code.length < 6}
          className="w-full rounded-lg bg-foreground px-4 py-4 text-base font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>

        <div className="flex justify-between text-sm text-neutral-500">
          <button
            type="button"
            className="hover:underline"
            disabled={busy}
            onClick={() => {
              setStep("email");
              setCode("");
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
            Resend code
          </button>
        </div>
      </form>
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
        {busy ? "Sending…" : "Email me a code"}
      </button>
    </form>
  );
}
