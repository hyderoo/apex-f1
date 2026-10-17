-- 0002_push_subscriptions.sql — Web Push subscriptions for session reminders.
--
-- All access goes through the service role from /api/push/* server routes,
-- so RLS is enabled with NO anon/authenticated policies (deny-all). Push
-- endpoint URLs are bearer secrets: anyone holding one can push to that
-- browser, which is why no client-side read policy exists.
--
-- Run in the Supabase SQL editor after 0001_init.sql.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'UTC',
  session_kinds text[] not null default '{race}',
  lead_minutes int not null default 30 check (lead_minutes in (15, 30, 60)),
  circuit_keys int[] not null default '{}',  -- empty = all circuits
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- One row per (subscription, session) already notified, so the 15-minute
-- dispatcher never double-sends. Cascades away with the subscription.
create table if not exists public.push_log (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  session_key int not null,
  sent_at timestamptz not null default now(),
  primary key (subscription_id, session_key)
);

alter table public.push_log enable row level security;
