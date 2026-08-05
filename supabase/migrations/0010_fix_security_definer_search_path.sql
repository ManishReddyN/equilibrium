-- Bug fix: every security-definer function was pinned to `search_path = public`
-- (a deliberate hardening pattern to block search_path-injection attacks), but
-- Supabase installs pgcrypto/uuid-ossp into the `extensions` schema, not
-- `public`. Any function body calling gen_random_bytes()/digest()/etc. fails
-- with "function ... does not exist" (42883) at call time -- confirmed via
-- on-device testing: fn_generate_invite (invite creation) and fn_join_household
-- (invite redemption, verified separately by inspection) both broke this way.
--
-- Fix: add `extensions` to each function's pinned search_path. This is a
-- superset of the previous value -- `public` is still searched first, so
-- existing name resolution for tables/other functions is unchanged -- and
-- matches how fn_invoke_edge_function (migration 0008) was already configured.
-- Applied blanket, to every security-definer function currently pinned to the
-- bare `public` value, rather than just the two confirmed-broken ones: this
-- whole class of function is one line away from hitting the identical bug the
-- moment any of them starts using a pgcrypto/uuid-ossp call, and there's no
-- safe way to know that won't happen in a later migration.

alter function fn_assign_cohorts(p_household_id uuid) set search_path = public, extensions;
alter function fn_claim_listing(p_listing_id uuid) set search_path = public, extensions;
alter function fn_complete_assignment(p_assignment_id uuid, p_proof_path text) set search_path = public, extensions;
alter function fn_create_household(p_name varchar(80), p_roommate_count int) set search_path = public, extensions;
alter function fn_dispatch_immediate_notification() set search_path = public, extensions;
alter function fn_feedback_set_release() set search_path = public, extensions;
alter function fn_generate_invite() set search_path = public, extensions;
alter function fn_handle_new_user() set search_path = public, extensions;
alter function fn_household_equilibrium(p_household_id uuid) set search_path = public, extensions;
alter function fn_join_household(p_invite_secret text) set search_path = public, extensions;
alter function fn_ledger_apply() set search_path = public, extensions;
alter function fn_market_guard() set search_path = public, extensions;
alter function fn_my_household() set search_path = public, extensions;
alter function fn_next_handler(p_chore_id uuid) set search_path = public, extensions;
alter function fn_notify_new_assignment() set search_path = public, extensions;
alter function fn_notify_new_listing() set search_path = public, extensions;
alter function fn_profiles_cohort_trigger() set search_path = public, extensions;
alter function fn_retract_feedback(p_feedback_id uuid) set search_path = public, extensions;
alter function fn_rotation_tick() set search_path = public, extensions;
alter function fn_skip_assignment(p_assignment_id uuid) set search_path = public, extensions;
