-- Ledger — notifications SPIKE, channel toggle. Run after 0014.
--
-- One ACTIVE channel per user: whatsapp | sms | off (default off).
-- The number is shared; consent stays PER CHANNEL and timestamped —
-- agreeing to WhatsApp messages is not agreeing to SMS, and each
-- channel's regulator (Meta policy, US A2P) wants its own proof.

alter table public.notification_prefs
  add column if not exists channel text not null default 'off'
    check (channel in ('whatsapp', 'sms', 'off')),
  add column if not exists sms_consent_at timestamptz;

alter table public.notification_queue
  add column if not exists channel text not null default 'whatsapp'
    check (channel in ('whatsapp', 'sms'));
