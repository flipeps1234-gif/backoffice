# contado — compliance checklist audit

**Scope:** live production (getcontado.com, main @ 9ce3806), audited 2026-10-08, plus the unreleased iPhone app where relevant. The teams/backup-password branch is excluded. This is a factual audit of what exists, **not legal advice**. Items marked for a lawyer need one.

**Score:** have 3 · partial 13 · missing 3 · not applicable 1

| # | Item | Status | One line |
|---|---|---|---|
| 1 | Privacy policy | **partial** | Accurate in substance but a self-declared placeholder. No date, operator, Cloudflare, cookies or children statement, and it contradicts itself on who sends sign-in email. The web app never links to it. |
| 2 | Terms of service | **partial** | 8 plain-words disclosure blocks plus "as-is". No contract terms (parties, liability, law, eligibility, termination, prices). Acceptance is stored only on the device. |
| 3 | Refund policy | **n/a** | Nothing is charged. Mandatory before the first charge. |
| 4 | Cookie policy | **missing** | "Cookie" appears 0 times live. GA sets `_ga` and `_ga_JEM7B09P0L` (about 2 years). |
| 5 | Cookie consent banner | **missing** | No consent step and GPC is ignored. A banner is probably not required for US-only use (lawyer to confirm), but disclosure and GPC are. |
| 6 | Check form consents | **partial** | Opt-ins are unticked. Consent records are device-only, the SMS wording is short of 10DLC requirements, and the founding form has no notice at the field. |
| 7 | No unnecessary data | **partial** | The phone number is saved without consent (live bug). EXIF reaches OpenAI on small uploads. The auth audit log may outlive deletion. |
| 8 | Audit third-party SDKs | **partial** | The SDK footprint is minimal. Cloudflare is undisclosed, GA Signals is unverified, and the native privacy manifest has gaps. |
| 9 | Remove dark patterns | **partial** | The "founding hundred" has no cap. Leaving the list is harder than joining. Account deletion keeps the founding email. |
| 10 | Remove hidden fees | **partial** | No fees exist. But /pricing says "no limits, nothing gated" while uploads are capped, and features sold as free are listed as future paid modules. |
| 11 | Remove fake reviews | **have** | None. Demo data is labeled. |
| 12 | Remove unsupported claims | **partial** | About 35 claims to fix, 6 of them false, now on 8 indexable URLs. |
| 13 | Accessibility alt text | **have** | Minor: twitter:image has no alt, and native checkboxes lack the selected trait. |
| 14 | Fix color contrast | **partial** | Public body copy, dark-mode secondary text, green buttons, placeholders and field borders fail. |
| 15 | Keyboard navigation | **partial** | Upload has no visible focus, the sale photo can't be reached, focus is lost on screen changes, no skip link, and the sticky banner hides focus. |
| 16 | Business details | **partial** | Email only. No legal name, address, operator or governing law (no entity yet). |
| 17 | Age consent | **missing** | No age or eligibility clause and no children statement. |
| 18 | Unsubscribe link in emails | **partial** | Founding email is promised but has no opt-out or address. SMS STOP works but the keyword list is narrow (dark). |
| 19 | License fonts/images | **partial** | Assets are fine. No trademark or non-affiliation notice, and the Next/Vercel template logos are served live. |
| 20 | Data deletion request | **have** | Web and native self-serve plus an email route. Fix the overclaims and the `tester@` guard bug. |

---

## Do first (live problems, mostly code and copy, little owner input)
1. **Fix the false claims.** "no limits", "as many as you like", "automatically", "saved forever", "backed up instantly", "Zelle exports nothing", "cash screenshots", privacy meta "read and discarded", contact meta "text us". See *Claims*.
2. **Analytics.** Honor GPC, set `allow_google_signals:false` and `allow_ad_personalization_signals:false`, drop doubleclick from the CSP, and add a cookie section with the Google partners link. **GA's own terms (§7) already require the cookie notice. Today that is a contract breach, whatever the company's size.**
3. **Privacy page.** Add a date and changes clause, a "Who we are" section (placeholder until the owner supplies details), Cloudflare, cookies, the children statement, and fix the Supabase vs Workspace contradiction. Add Privacy/Terms links inside the web app (gate and Settings) and a notice under the founding form.
4. **Phone-without-consent bug.** It makes the privacy policy false. Fix it on web and native.
5. **Contrast codemod.** `text-neutral-500` → `text-neutral-600 dark:text-neutral-400`, and emerald-600 buttons → emerald-700. Public body copy fails on every page.
6. **Keyboard.** Visible focus on upload, the sale-photo input reachable, a skip link, and scroll-padding under the sticky banner.
7. **Trademark.** Footer non-affiliation line, fix the ES/PT possessive channel names, and delete the template SVGs.
8. **Owner, 5 minutes in Cloudflare.** Turn off Email Address Obfuscation. It turns the privacy-rights contact into "[email protected]".

**Before the first founding email:** an unsubscribe link and List-Unsubscribe header, a postal address, and a sender tool.
**Before SMS goes live:** 10DLC CTA wording, wider STOP/HELP handling, server-stamped consent, migrations 0026/0027 applied, and re-collected consent.
**Before taking money:** a legal entity, full ToS, refund and auto-renewal policy, founding-offer terms, tax disclosure, and the Vercel plan upgrade.
**Before the iPhone release:** privacy manifest (UserID, user content), App Store privacy label, copyright, native light-mode tokens, and the native a11y traits.

> **Head start:** unshipped commit `c3edb4b` (branch `fix/security-review-2026-09-04`, not in production) already has a consent-mode GA banner, web legal links, Cloudflare in the processor list and some dark-contrast fixes. Reconcile with it instead of rewriting. It still has no cookie names or durations. Native `messages.json` was regenerated from that branch and promises a banner the live site doesn't have.

---

## Item notes

**1 Privacy policy — partial.**
*What's right:* /privacy (EN/ES/PT) correctly lists the stored data, the processors (Supabase, Vercel, Google sign-in, OpenAI with 30-day retention, Workspace mail, GA public-only, Twilio/Meta), the 7-day deletion purge, the 35-day usage purge, export/delete rights and DNT.
*Gaps:*
- It calls itself a placeholder (help.legalNote).
- No effective date or change process, which CalOPPA requires.
- No operator name or address.
- Cloudflare proxies every request but isn't named.
- IP logging by Vercel, Cloudflare and Supabase Auth isn't disclosed.
- GA is described as "may use" though it is always on. There is no cookie or GPC mention.
- "We don't sell or share" depends on GA admin settings.
- It contradicts itself on who sends sign-in email.
- "What we store" omits: Google name and avatar, expenses and categories, service prices and costs, owner name and state, mileage distances.
- No children statement, no response deadline, no verification step, no residual-copy note.
- The web app links /privacy nowhere. Only the public footer and the landing page do.

**2 Terms — partial.**
*What's right:* the 8 blocks are honest and shown before sign-in in all 3 languages.
*Gaps:*
- They are a disclosure, not a contract.
- Missing: parties, eligibility, acceptable use, license to process, liability cap, indemnity, termination, governing law, changes clause on /terms, SMS terms, and terms for the live "$6/mo forever" founding promise.
- "OK — I understand" is stored only in localStorage, with no per-account record.
- The web gate has no Privacy/Terms links (native does).

**3 Refund — n/a.** No billing code, no StoreKit, "nothing is billed yet". A refund and auto-renewal policy (CA ARL/ROSCA) is a hard prerequisite for the first charge.

**4 Cookie policy — missing.**
*What is set:* public pages set `_ga` and `_ga_JEM7B09P0L`. The app sets no cookies; it uses `contado.*` localStorage keys and the Supabase session token.
*What's missing:* none of this is disclosed, and DNT is the only refusal path.
*Fix:* a "Cookies & local storage" section on /privacy plus a footer anchor.

**5 Consent banner — missing.**
*What happens today:* GA loads for everyone who doesn't send DNT, which in practice is nearly everyone (Safari dropped DNT). GPC is ignored. EU/UK/BR visitors, whom the PT/ES copy and the LGPD mention invite, get GA without opt-in.
*Recommendation:* honor GPC, turn Signals/ads off, and use consent-mode default-denied for EEA/UK/BR. A global banner is likely unnecessary (lawyer to confirm).

**6 Form consents — partial.**
*Forms:* founding email, sign-in (only reachable after the gate), the terms gate, and the SMS/WhatsApp opt-in. There is no contact form.
*Gaps:*
- No Privacy link at the gate or in the app.
- No notice at the founding field (it is disclosed only on /privacy).
- Consent timestamps come from the device, and the wording version isn't stored.
- SMS wording lacks the brand, message frequency, HELP and Terms/Privacy links.
- The WhatsApp box names neither contado nor WhatsApp.
- The SMS opt-in sits under the heading "WhatsApp alerts".
- 0026 isn't applied, and native clears `opted_out_at`.
- No "mobile data not shared for marketing" sentence.
*Not a gap:* a "By continuing you agree" line at sign-in would be redundant, because the gate always comes first.

**7 No unnecessary data — partial.**
*What's right:* every column has a use, sale photos are re-encoded (EXIF stripped), GA gets no PII, and webhooks mask phone numbers.
*Gaps:*
- **Phone saved without consent or after Off** (settings-page.tsx:243-244, native :496).
- JPEG/WebP files under 400 KB reach OpenAI with EXIF/GPS.
- The Supabase auth audit log may keep email and IP after deletion (owner check).
- Photos can't be removed one at a time (disclosed).
- The founding list has no retention end.
- notification_queue has no purge (latent).

**8 Third-party SDKs — partial.**
*What's right:* dependencies are only supabase-js, next and react. In the browser, only GA and Supabase are contacted. The native app has no packages and has a privacy manifest. Cloudflare Web Analytics was already turned off.
*Gaps:*
- Cloudflare is unnamed and its email obfuscation rewrites the legal contact.
- GA Signals is unverified and doubleclick is allowed in the CSP.
- Enhanced Measurement collects more than "counts visits".
- The native manifest lacks UserID and OtherUserContent.
- OpenAI ZDR and DPAs are not on file.
*Later:* CSP `'unsafe-inline'` hardening. Use nonces, not layout-script hashes.

**9 Dark patterns — partial.**
*Clean:* no pre-checked marketing or data boxes, no confirmshaming, no countdowns, ads or review prompts. Deletion is "type your email" plus a cancelable 7-day wait.
*Gaps:*
- The "founding hundred / Save my spot" offer implies limited places, but there is no cap and everyone is told the price is theirs.
- Leaving the list needs an email and a manual delete.
- Account deletion keeps the founding email while the copy says "everything erased".

**10 Hidden fees — partial.**
*What's right:* zero fees exist, so nothing is literally hidden.
*Gaps:*
- /pricing claims "no limits and nothing gated", but uploads are capped at 40 per account per day, plus **200/day and 1,000/month shared across all users**. DEPLOY.md says about 100 owners use up the month by day 2. The cap message is English-only and doesn't say when uploads resume.
- Auto-clearing Owed, recurring jobs and multi-device sync are sold as free but listed on /pricing or in the owner's plan as paid modules.
- "One price for all of it" conflicts with separately priced tax filing, seats and payment links.
- No tax, renewal or cancellation terms yet.

**11 Fake reviews — have.** No testimonials, ratings, counts, logos or review JSON-LD. Demo names are labeled. Rule for later: real, attributable, verbatim, incentives disclosed (FTC 16 CFR 465).

**12 Unsupported claims — partial.**
*What's right:* many claims are true and hedged (RLS, integer cents, no bank login, the OpenAI 30-day note, "estimate, not a promise").
*Gaps:* about 35 claims need fixing (list below). Since 9ce3806, every /for and /track page renders the full landing page, so these claims appear on 8 URLs.

**13 Alt text — have.**
*What's right:* the two `<img>` elements (user photos) have translated alt text, icon-only controls are labeled, and there is OG alt.
*Minor fixes:* twitter:image alt, a fuller OG alt, DemoFrame descriptions, and native `.isSelected` traits plus hidden "›" glyphs.

**14 Contrast — partial.**
*Passing:* main text, notices, chips, the black banner and sidebar, large totals.
*Failing:*
- Secondary grey text on every public page (3.76).
- Nearly all secondary text in dark mode (3.8–4.2).
- Primary green buttons (3.73).
- The founding email field, where the placeholder is the only label (2.58).
- Field borders (1.48, non-text contrast).
- Native light-mode tokens (about 3.7).
design-tokens.md itself prescribes the failing pairs. Details below.

**15 Keyboard — partial.**
*What's right:* default focus rings are kept, the DOM order is sane, the drawer is a proper modal, and the swipe deck has arrow keys plus buttons.
*Gaps:*
- No visible focus on the upload drop zone or "Snap a receipt".
- "Add a photo" can't be reached (`display:none` input).
- The client photo is an `img onClick`.
- Focus drops to `<body>` on every step or screen change.
- QuickAdd has a global digit shortcut (WCAG 2.1.4).
- The swipe focus ring is invisible in dark mode.
- The product card nests buttons.
- No skip link, and header and footer sit inside `<main>`.
- The 56 px sticky phone banner can hide focused controls (2.4.11).

**16 Business details — partial.**
*What exists:* mail@getcontado.com on /contact, the footer, /privacy, security.txt and in the native app.
*Gaps:*
- No legal name, operator, postal address or governing law anywhere.
- The JSON-LD Organization has none of these either.
- Web Settings shows no contact, only "Support line — coming soon".
*Blocked on:* the owner's identity and address.

**17 Age — missing.** No eligibility clause and no children statement in any language, web or native. The product isn't aimed at children, so standard statements are enough and no age gate is needed. The 18 vs 13 floor is for the lawyer.

**18 Unsubscribe — partial.**
*Email:* only transactional auth emails go out today, and those are exempt. The founding list promises a commercial email but has no sender, unsubscribe link, postal address or suppression list; removal is by email plus a manual delete.
*SMS (sending is turned off):* templates say "Reply STOP" and the webhooks record opt-outs. But the keyword list misses unsubscribe, quit, end, revoke, opt out, stopall, salir and sair. There is no HELP reply on WhatsApp, two WhatsApp templates lack an opt-out line, and SMS bodies don't say "contado:".

**19 Licensing — partial.**
*What's right:* Geist (OFL) is self-hosted, the logo and icons are original, there are no stock images, and production dependencies are permissive.
*Gaps:*
- No trademark or non-affiliation notice, despite the Venmo/Cash App/Zelle URLs, titles and OG card.
- ES/PT "Contabilidad de Venmo" reads as Venmo's own product.
- The hand-traced Google "G" is dormant, but must be swapped before Google sign-in is enabled.
- Next and Vercel logos are served at /next.svg and /vercel.svg.
- No open-source notices.
- "© contado" names no legal person.
- The native app has no copyright string.

**20 Deletion — have.**
*What's right:* self-serve on web and native (type your email, 7-day cancel window, nightly pg_cron cascade covering every table), an email route, and disclosure.
*Fix:*
- The "everything / every row" overclaims, since the founding email and anonymized usage rows survive.
- The `split_part(email,'@',1) <> 'tester'` guard blocks deletion for any `tester@<anydomain>` user.
- No runbook or deadline for emailed requests.
- The purge stalls if the free-tier project pauses.

---

## Code and copy fixes (for the engineer)
1. GA: GPC, Signals and ads flags off, drop doubleclick from CSP (S)
2. EEA/UK/BR consent mode, reconciling with c3edb4b (M)
3. /privacy content pass, all 3 languages, including the cookies section and GA partners link (M)
4. Footer: Cookies link and trademark line (S)
5. Web in-app Privacy/Terms/contact links in the gate and Settings (S)
6. Terms scaffold, "I agree" wording, one TERMS_VERSION bump (M, ship once the lawyer's text is in)
7. Server-side `terms_acceptances` table (M)
8. Notice and Privacy link under the founding form (S)
9. Founding-list unsubscribe endpoint and headers (M, before the first email)
10. Phone-without-consent bug, web and native; stop native writing `optedOutAt` (S)
11. Trigger that stamps consent times on the server, plus a consent text version (S)
12. SMS/WhatsApp opt-in wording and heading (S)
13. STOP/HELP keywords, WhatsApp opt-out lines, "contado:" prefix (S)
14. Marketing copy batch, then regenerate native messages.json (M)
15. Localized upload-limit message that says when uploads resume (S)
16. Savings calculator caveat (S)
17. Deletion copy caveats and the `tester@` guard migration (S)
18. Always strip EXIF before upload (S)
19. notification_queue purge (S, latent)
20. Web contrast codemod and design-tokens.md (M)
21. Native light tokens #047857 and #b45309 (S)
22. axe/Playwright contrast check (M)
23. Keyboard batch (L)
24. Alt text minor fixes (S)
25. Licensing cleanup: SVGs, README, ES/PT names, notices, Google G (S)
26. Native privacy manifest and copyright (S)
27. JSON-LD legalName and address (S, after owner input)
28. Later: CSP nonces (M)

## What only the owner can supply
- **Identity:** legal name (sole proprietor until an LLC), state, and a mailing address (PO box or CMRA is fine).
- **Effective date** for the revised privacy policy and terms.
- **GA4 admin:** Signals OFF, ads personalization OFF, no Google Ads link, 2-month retention. Decide whether Enhanced Measurement stays.
- **EU/UK/BR stance** (with the lawyer), and whether to reuse c3edb4b.
- **Founding offer:** enforce 100 or drop "hundred". Define qualification, scope, what happens on a lapse or deletion, and tax.
- **Paid launch scope:** which free features stay free for new users. Whether tax filing, seats or payment links are priced separately.
- **Upload limit:** how to describe it publicly, or raise the shared caps.
- **Cloudflare:** turn off Email Obfuscation, review NEL and Bot Fight.
- **Supabase:**
  - Turn off the auth audit-log database storage, or purge it for deleted users.
  - Confirm the project region is US.
  - Confirm both cron jobs exist.
  - Decide on the plan or a keep-alive so the purge doesn't stall.
  - Apply migrations 0026, 0027 and any new ones.
- **Google Workspace:** retention on the Sent folder. Confirm the auth email templates have no promotional content.
- **Vendors:** OpenAI ZDR, and DPAs on file.
- **Deletion runbook:** steps and deadline for emailed access/deletion requests.
- **Before the founding email:** a sender tool with List-Unsubscribe.
- **SMS:** 10DLC registration and a plan to re-collect consent.
- **App Store:** copyright, privacy label, age rating, keyword field kept free of Venmo/Cash App/Zelle.
- **Trademark search** for "contado".
- **Native-speaker ES/PT review.**
- **Vercel:** upgrade from Hobby before charging.
- **Refunds:** refund windows and Apple IAP decision.

## What a lawyer should review
1. **Privacy text:** the final privacy policy text — CCPA/CPRA applicability, "sell or share" with GA, CalOPPA, LGPD controller identification and Art. 14, GDPR stance.
2. **EU/UK/BR banner:** whether visitors there need a banner or a geo-disable.
3. **Full ToS:** liability cap, arbitration, governing law, enforceability of device-only clickwrap, use as the Google OAuth terms URL.
4. **Age floor:** 18 vs 13.
5. **Founding promises:** "forever", "never rises", "free forever" made with no legal entity, including ES/PT and native.
6. **Paid launch:** refunds, auto-renewal law (CA ARL, ROSCA), sales tax, Apple IAP.
7. **SMS program:** 10DLC, TCPA and the FCC revocation rule, Meta opt-in.
8. **CAN-SPAM:** founding email footer and the address question.
9. **Deletion/access:** deadlines, verification, residual-copy disclosure.
10. **Trademark:** nominative use in URLs and titles, disclaimer wording.
11. **Entity timing:** formation before charging, and Cal. Civ. Code §1789.3.
12. **Proof of income:** how to market it to landlords and lenders.

## Marketing claims to fix (summary; full list with ES/PT in the structured output)
- **False:**
  - "free today, with no limits and nothing gated" and "one price for all of it" (site.pricingIntro)
  - "as many as you like" (6 places, including help docs and the app)
  - "Zelle and cash screenshots" (home meta)
  - "real books, automatically" (hero, meta, OG)
  - "Every log saved instantly, forever, free"
  - "✓ Backed up instantly"
  - Zelle "exports nothing / no history page"
- **Soften:**
  - "ten seconds", "two minutes"
  - savings calculator 15 min
  - "Schedule C basically done / tax-ready", "your taxes, all free"
  - "reads every payment", "nothing counts twice", Owed "clears itself automatically", "any bank"
  - "Millions … almost none have books"
  - "everything erased for good / every row"
  - "nobody else's", "operator can never see"
  - "Export everything"
  - proof of income missing "not a verified statement"
  - privacy meta "read and discarded", contact meta "text us"
- **Contradictions:**
  - auto-clear and recurring jobs sold as free but listed as paid Autopilot
  - "may use" GA (it is always on)
  - Supabase vs Workspace sending sign-in email
  - phone stored "if you turn on" reminders (actually always)
- **Trademark/translation:** "Works with the apps…", ES/PT "Contabilidad de Venmo", ES "Siempre sabes".
- **Lawyer or owner decision:** founding "hundred / locked forever / never rises", "we don't sell or share".

## Contrast failures (summary; file:line in the structured output)
| Where | What fails | Ratio |
|---|---|---|
| Public grey page | `neutral-500` secondary text | 3.76 |
| Dark mode | `neutral-500` (about 226 lines, 7 label classes) | 3.78–4.18 |
| /app grey hero | neutral-500 / emerald-700 / red-600 / amber-700 | 3.76 / 4.26 / 3.78 / 3.99 |
| Buttons | white on emerald-600 (Join, Business, primary, chip) | 3.73 |
| Small emerald-600 text | | 3.73 |
| red-500 on white | | 3.81 |
| red-600 in dark mode | | 4.15 |
| neutral-400 info text, dismiss × | | 2.58 |
| Personal amounts | red-300 | 1.92 |
| Tinted surfaces | neutral-500 on neutral-100 / selected card | 4.34 / 3.85–4.22 |
| Placeholders | 2.58; the only label on the founding, /help and app search fields | 2.58 |
| Field borders | neutral-300 | 1.48 |
| Founding CTA messages | amber-700 / emerald-700 | 3.99 / 3.82 |
| Swipe focus ring | dark mode | about 1:1 |
| Native light mode | emerald / amber tokens | 3.77 / 3.71 |

**Fix:** `text-neutral-600 dark:text-neutral-400` (6.19 to 7.80), `bg-emerald-700` buttons (5.37), emerald-700/emerald-400 text, red-600/red-400, emerald-800/red-700/amber-800 on the grey hero, neutral-500 placeholders and borders, and native #047857 / #b45309.

## Method and limits
- Every entry was audited and then independently re-checked. I spot-verified the key evidence (GA config, legal links, cap values, claim lines, the c3edb4b status) against main @ 9ce3806.
- Not verifiable from the repo, so these are owner checks:
  - GA admin settings
  - Supabase audit-log and cron state
  - Supabase email templates
  - Workspace Sent-folder retention
  - Cloudflare dashboard settings
