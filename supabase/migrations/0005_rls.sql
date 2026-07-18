-- ============================================================
-- fn_my_household: helper used by nearly every RLS policy
-- ============================================================
create or replace function fn_my_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from profiles where id = auth.uid()
$$;

-- ============================================================
-- households
-- ============================================================
alter table households enable row level security;

create policy hh_select on households for select
  using (id = fn_my_household());
create policy hh_update on households for update
  using (id = fn_my_household()) with check (id = fn_my_household());
-- INSERT on households allowed for any authenticated user (creating a new household);
-- creator's profile.household_id set in the same RPC transaction.
create policy hh_insert on households for insert
  to authenticated with check (true);

-- SQL-migration-created tables get no default DML grants for authenticated/anon
-- (unlike tables created via the Studio UI) -- RLS policies alone are inert
-- without this baseline table-level privilege.
grant select, insert, update on households to authenticated;

-- ============================================================
-- profiles
-- ============================================================
alter table profiles enable row level security;

create policy pr_select on profiles for select
  using (id = auth.uid() or household_id = fn_my_household());
create policy pr_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

grant select on profiles to authenticated;
-- Column-restricted UPDATE grant: household_id/cohort_index/points_balance are deliberately
-- excluded. pr_update_self's row-filter alone would let any user set their own household_id
-- to any existing household id, bypassing fn_join_household's invite-code/capacity checks
-- entirely. Those columns may only change via security-definer RPCs.
grant update (full_name, avatar_path, push_token_ios, push_token_android)
  on profiles to authenticated;

-- ============================================================
-- chores
-- ============================================================
alter table chores enable row level security;

create policy ch_all on chores for select using (household_id = fn_my_household());
create policy ch_ins on chores for insert with check (household_id = fn_my_household());
create policy ch_upd on chores for update using (household_id = fn_my_household())
  with check (household_id = fn_my_household());

grant select, insert, update on chores to authenticated;

-- ============================================================
-- assignments
-- ============================================================
alter table assignments enable row level security;
-- select: household members. insert/update: ONLY via security-definer RPCs; no direct policy.
create policy as_select on assignments for select using (household_id = fn_my_household());

grant select on assignments to authenticated;

-- ============================================================
-- audit_ledger
-- ============================================================
alter table audit_ledger enable row level security;
create policy al_select on audit_ledger for select using (household_id = fn_my_household());
-- no insert/update/delete policies for clients: ledger written only by security definer functions.

-- Append-only, defense in depth: grant SELECT only. Even a client holding a
-- valid session can never insert/update/delete -- fn_ledger_apply (security
-- definer) is the sole writer, and 0004's trigger also blocks direct writes.
grant select on audit_ledger to authenticated;

-- ============================================================
-- feedback_queue (duo cool-off)
-- ============================================================
alter table feedback_queue enable row level security;

create policy fb_select on feedback_queue for select
  using (author_id = auth.uid()
     or (recipient_id = auth.uid() and release_at <= now()));  -- cool-off enforced at read time too
create policy fb_insert on feedback_queue for insert
  with check (author_id = auth.uid() and household_id = fn_my_household());

grant select, insert on feedback_queue to authenticated;

-- ============================================================
-- market_listings (shared_flat)
-- ============================================================
alter table market_listings enable row level security;

create policy ml_select on market_listings for select using (household_id = fn_my_household());
create policy ml_insert on market_listings for insert
  with check (lister_id = auth.uid() and household_id = fn_my_household());
create policy ml_update on market_listings for update using (household_id = fn_my_household());

-- Anonymity: column-level grants are all-or-nothing in Postgres, so lister_id cannot be
-- conditionally hidden per-row on the base table. Instead, revoke SELECT on the lister_id
-- column entirely for client roles and expose it only through this view, which nulls it out
-- whenever the lister opted into anonymity. Non-anonymous listings still leak nothing extra:
-- the view is the only path to lister_id for clients either way.
create view market_listings_public as
  select
    id,
    household_id,
    assignment_id,
    case when is_anonymous then null else lister_id end as lister_id,
    listing_type,
    bounty_points,
    is_anonymous,
    claimed_by,
    status,
    created_at,
    updated_at
  from market_listings;

alter view market_listings_public set (security_invoker = true);

revoke select on market_listings from authenticated, anon;
grant select (id, household_id, assignment_id, listing_type, bounty_points,
              is_anonymous, claimed_by, status, created_at, updated_at)
  on market_listings to authenticated;
grant insert, update on market_listings to authenticated;
grant select on market_listings_public to authenticated;

-- ============================================================
-- notification_outbox
-- ============================================================
alter table notification_outbox enable row level security;
create policy no_select on notification_outbox for select using (recipient_id = auth.uid());

grant select on notification_outbox to authenticated;
