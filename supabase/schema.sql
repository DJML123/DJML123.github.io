-- OnSpot: one snapshot row per user (anonymous auth).
-- Run in the Supabase SQL editor: Dashboard -> SQL Editor -> New query -> Run.
-- The app upserts its whole persisted state into `data` (JSONB).
-- More granular tables (spots, streams, chats, reports) follow later - the
-- app already logs all of it (see repo.getAnalytics()/getReports()).

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_own" on public.app_state;
create policy "app_state_own"
  on public.app_state
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Coin wallets. Clients never write here: balances are credited only by the
-- grant-coins / redeem-iap edge functions (service role), debits happen in
-- app_state.data under the user's own row.
create table if not exists public.wallets (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  balance    bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

drop policy if exists "wallets_read_own" on public.wallets;
create policy "wallets_read_own"
  on public.wallets
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Idempotent grant ledger: one credit per user+reason, ever. Makes the
-- referral bonus server-side safe against double-claims (the client-side
-- guard is a UX nicety, this is the enforcement).
create table if not exists public.grant_log (
  user_id    uuid not null references auth.users (id) on delete cascade,
  reason     text not null,
  coins      bigint not null check (coins > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, reason)
);

alter table public.grant_log enable row level security;

drop policy if exists "grant_log_own" on public.grant_log;
create policy "grant_log_own"
  on public.grant_log
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Atomic, additive wallet credit. Wraps ledger + increment in one
-- transaction so a crash can never leave a credit without a log entry.
--
-- Returns the new balance *and* whether this call was the one that credited
-- it. The caller cannot infer that from the balance alone, and the edge
-- functions used to answer the question with a SELECT before calling this -
-- an extra round trip plus a window where two parallel requests both read
-- "not claimed yet". Reporting it from inside the transaction removes both.
--
-- Postgres refuses to change a function's return type in place, so the old
-- `returns bigint` version is dropped rather than replaced.
drop function if exists public.claim_grant(uuid, text, bigint);

create function public.claim_grant(p_user uuid, p_reason text, p_coins bigint)
returns table (balance bigint, granted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
begin
  insert into public.grant_log (user_id, reason, coins)
  values (p_user, p_reason, p_coins)
  on conflict (user_id, reason) do nothing;

  -- FOUND is false when the insert hit the conflict, i.e. this user has
  -- already been credited for this exact reason.
  if not found then
    select w.balance into v_balance from public.wallets w where w.user_id = p_user;
    return query select coalesce(v_balance, 0), false;
    return;
  end if;

  insert into public.wallets (user_id, balance)
  values (p_user, p_coins)
  on conflict (user_id)
  do update set balance = public.wallets.balance + excluded.balance, updated_at = now()
  returning wallets.balance into v_balance;

  return query select v_balance, true;
end;
$$;

revoke execute on function public.claim_grant(uuid, text, bigint) from public, anon;
grant execute on function public.claim_grant(uuid, text, bigint) to authenticated, service_role;
