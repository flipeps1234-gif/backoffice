"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { MessageKey } from "@/lib/i18n";
import { currentLocale } from "@/lib/locale";
import { useLocale } from "./use-locale";

/**
 * Sign in with an emailed magic link. Sessions persist on the device, so this
 * happens once per device, not per visit.
 *
 * We tried a typed 6-digit code instead, because a link always opens in the
 * browser and so can never sign in an installed home-screen app. It was
 * reverted: the email body is decided by Supabase's template, not by this
 * code — signInWithOtp sends whatever the template renders. Emitting a code
 * needs {{ .Token }} in the Magic Link AND Confirm signup templates, and at
 * the time, editing those needed a custom SMTP provider we did not have —
 * so asking the user to type a code that never arrives was worse than a
 * link that works. That blocker is GONE as of 2026-09-01 (Google Workspace
 * SMTP; the templates are customized and owned in the Supabase dashboard,
 * see CLAUDE.md "AUTH EMAIL LANGUAGE"), so reviving the code is now an
 * owner-side template edit rather than a repo change. It stays reverted
 * until someone decides to make it. The home-screen-app caveat below is
 * the price of the link, and it is real.
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
export const humanAuthError = (
  raw: string,
  t: (key: MessageKey) => string,
): string => {
  // "{}" is what auth-js produces for a REACHABLE server answering
  // 5xx: its _getErrorMessage finds no message field on the Response
  // object and JSON.stringify's it. Same meaning as an unreachable
  // server — the outage copy, not two braces in a red box.
  const unreachable =
    raw === "{}" ||
    /failed to fetch|load failed|networkerror|fetch failed|network request failed/i.test(
      raw,
    );
  if (unreachable) {
    return t("signin.unreachable");
  }
  // Supabase's own messages (rate limits, malformed address) are already
  // written for humans, so they pass through untouched.
  return raw || t("signin.genericError");
};

export default function SignIn() {
  const { t } = useLocale();
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
        setError(data.error ?? t("signin.demoFailed"));
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
        setError(humanAuthError(sessionError.message, t));
      }
    } catch {
      setError(t("signin.demoUnreachable"));
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
        // Stamped into user_metadata at ACCOUNT CREATION (ignored for
        // existing users): the device's chosen language — which itself
        // falls back to browser detection — so the auth emails can
        // localize via {{ .Data.lang }}. Always "en" | "es" | "pt";
        // the templates treat missing as "en". Nothing else goes in
        // metadata for this.
        data: { lang: currentLocale() },
      },
    });

    setBusy(false);
    if (sendError) {
      console.error("Sign-in request failed:", sendError);
      setError(humanAuthError(sendError.message, t));
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
          <h2 className="text-sm font-semibold">{t("signin.checkEmail")}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t("signin.sentTo", { email: email.trim() })}{" "}
            <strong className="font-medium text-foreground">
              {t("signin.onThisDevice")}
            </strong>{" "}
            {t("signin.sentTail")}
          </p>
        </div>

        {resent && !error && (
          <p aria-live="polite" className="text-sm text-emerald-700 dark:text-emerald-400">
            {t("signin.newLinkSent")}
          </p>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </p>
        )}

        <p className="text-sm text-neutral-500">
          {t("signin.nothingYet")}
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
            {t("signin.differentEmail")}
          </button>
          <button
            type="button"
            className="hover:underline"
            disabled={busy}
            onClick={resend}
          >
            {busy ? t("signin.sending") : t("signin.resendLink")}
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
          {t("signin.emailLabel")}
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
          placeholder={t("signin.emailPlaceholder")}
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
        {busy ? t("signin.sending") : t("signin.sendButton")}
      </button>
    </form>
  );
}
