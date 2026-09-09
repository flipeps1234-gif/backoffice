"use client";

import { useEffect, useState } from "react";
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
 */

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
  code?: string,
): string => {
  // GoTrue has two independent 429s on the OTP endpoint: the auth-email
  // bucket (project-wide 30/h plus a 60 s per-address cooldown —
  // over_email_send_rate_limit, which reached the screen as raw English
  // three times on launch night) and the per-IP request bucket (~30 per
  // 5 min — over_request_rate_limit, the one a venue's shared Wi-Fi
  // trips). Both mean "wait", the one auth error a cleaner can do nothing
  // else about, so both get the same words in their language.
  if (isRateLimited(code)) {
    return t("signin.tooMany");
  }
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
  // Supabase's remaining messages (a malformed address, a disabled
  // provider) are already written for humans, so they pass through
  // untouched — rate limits are handled above, never here.
  return raw || t("signin.genericError");
};

/** Both of GoTrue's 429 codes on /otp; see humanAuthError. */
const isRateLimited = (code: string | undefined): boolean =>
  code === "over_email_send_rate_limit" || code === "over_request_rate_limit";

/**
 * Whether the project has Google sign-in switched on. GoTrue publishes
 * this at /auth/v1/settings for the anon key — one small GET, cached for
 * the page's life, false on any failure (the email link still works).
 */
let googleProbe: Promise<boolean> | null = null;
const googleEnabled = (): Promise<boolean> => {
  googleProbe ??= (async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return false;
    try {
      const response = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return false;
      const settings = (await response.json()) as { external?: Record<string, unknown> };
      return settings.external?.google === true;
    } catch {
      return false;
    }
  })();
  return googleProbe;
};

/** Google's four-color "G", drawn inline so no external asset loads. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.6c-.1 1.1-.9 2.7-2.5 3.8l3.7 2.9c2.2-2 3.7-5 3.7-8.6z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5.1l-3.9 3C3.1 21.3 7.2 24 12 24z" />
      <path fill="#FBBC05" d="M5.1 14.3c-.3-.8-.4-1.5-.4-2.3s.2-1.6.4-2.3l-3.9-3C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l3.9-3z" />
      <path fill="#EA4335" d="M12 4.7c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.2 0 3.1 2.7 1.2 6.7l3.9 3c1-3 3.7-5 6.9-5z" />
    </svg>
  );
}

export default function SignIn() {
  const { t } = useLocale();
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  // When "Resend link" is offered again. The server refuses a second email
  // to the same address inside 60 s anyway; counting it down here turns a
  // 429 into a number the user can watch instead of an error they cannot
  // act on. A DEADLINE, not a tick count: the phone goes to Mail to fetch
  // the link and iOS suspends the page's timers, so a decrementing counter
  // would still read "43s" two minutes later. Derived from the clock, and
  // re-read when the tab becomes visible again.
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // "Continue with Google" shows only when the Supabase project has the
  // provider switched on (Dashboard → Auth → Providers). A button that
  // bounced every visitor to a JSON error page until the owner finished
  // the setup would be copy that does not match behavior.
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    let stale = false;
    googleEnabled().then((ready) => {
      if (!stale) setGoogleReady(ready);
    });
    return () => {
      stale = true;
    };
  }, []);
  const cooldown =
    cooldownUntil === null ? 0 : Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  // Sample the clock here too: `now` is otherwise the last tick's value,
  // and the first commit after arming would read 61.
  const startCooldown = () => {
    const at = Date.now();
    setNow(at);
    setCooldownUntil(at + 60_000);
  };

  useEffect(() => {
    if (cooldownUntil === null) return;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      // The deadline is wall-clock, so a clock set BACK mid-window (NTP
      // fixing a fast phone, a manual time change) would read "Resend in
      // 3640s" and hold the button that long. Never wait more than the
      // 60 s the window is for; a clock set forward just ends it early,
      // and a real 429 re-arms it.
      if (cooldownUntil - at > 60_000) setCooldownUntil(at + 60_000);
      else if (at >= cooldownUntil) setCooldownUntil(null);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [cooldownUntil]);

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
      setError(humanAuthError(sendError.message, t, sendError.code));
      // The very case the countdown exists for: a reload or a second tab
      // wiped the local timer and the server's window is still open.
      // Arm it here too, or the button re-enables for a doomed tap.
      if (isRateLimited(sendError.code)) startCooldown();
      return;
    }
    setSent(true);
    startCooldown();
  }

  async function signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) return;

    setBusy(true);
    setError("");
    // Lands on the bare origin like the magic link (the only allowed
    // redirect); the landing forwards the tokens to /app. select_account
    // so a person with two Google accounts gets to choose every time.
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
    // On success the browser has already left for Google; only a failure
    // to even start the handoff comes back here.
    if (oauthError) {
      console.error("Google sign-in failed to start:", oauthError);
      setError(t("signin.googleFailed"));
      setBusy(false);
    }
  }

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
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
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
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
            className="hover:underline disabled:no-underline disabled:opacity-60"
            disabled={busy || cooldown > 0}
            onClick={resend}
          >
            {busy
              ? t("signin.sending")
              : cooldown > 0
                ? t("signin.resendIn", { seconds: cooldown })
                : t("signin.resendLink")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submitEmail}>
      {googleReady && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void signInWithGoogle()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-4 text-base font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <GoogleMark />
            {t("signin.google")}
          </button>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-500">
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
            {t("signin.or")}
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
          </div>
        </>
      )}
      <div>
        <label
          className="mb-1 block text-xs font-medium text-neutral-500"
          htmlFor="email"
        >
          {t("signin.emailLabel")}
        </label>
        {/* The browser's own validation catches a malformed address before
            an email is spent on it; Supabase still rejects server-side. */}
        <input
          id="email"
          type="email"
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
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
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
