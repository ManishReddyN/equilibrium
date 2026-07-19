-- ============================================================
-- Phase 5 section 5.2: DB-side plumbing for the push pipeline and the two
-- scheduled workers. All three edge functions (push-dispatch, digest-worker,
-- rotation-tick) are invoked from Postgres itself (a row trigger for the
-- immediate case, pg_cron for the two scheduled sweeps) via pg_net, rather
-- than Supabase dashboard-configured Database Webhooks/Cron -- this repo's
-- existing convention is that all backend behavior is a reviewable
-- migration, not dashboard-only state (see market_listings/feedback_queue's
-- RLS-as-SQL, RPCs-as-SQL precedent throughout 0004/0005). See
-- docs/DECISIONS.md for the Vault secrets this depends on.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

-- ============================================================
-- fn_invoke_edge_function: fire-and-forget POST to a deployed edge function,
-- authenticated with the project's own service role key. Both the URL and
-- the key come from Supabase Vault (`project_url` / `service_role_key`
-- secrets, set once out-of-band -- see docs/RUNBOOK.md) rather than being
-- hardcoded, since this file is committed and neither value may ever appear
-- in git. No-ops (with a warning, not an error, so it never blocks the
-- triggering insert/cron tick) if those secrets aren't set yet, e.g. before
-- the real Firebase/edge-function deploy step happens.
--
-- Deliberately NOT public-executable (a deviation from every other function
-- in this codebase, which rely on internal auth.uid() checks and are left
-- PUBLIC-executable per 0007's convention): this one has no per-caller
-- authorization logic at all, so PUBLIC execute would let any authenticated
-- client make the database originate arbitrary HTTP requests carrying the
-- service role key. See docs/DECISIONS.md.
-- ============================================================
create or replace function fn_invoke_edge_function(p_function_name text, p_payload jsonb)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_project_url text;
  v_service_role_key text;
begin
  select decrypted_secret into v_project_url
  from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets where name = 'service_role_key';

  if v_project_url is null or v_service_role_key is null then
    raise warning 'fn_invoke_edge_function: Vault secrets project_url/service_role_key not set, skipping %', p_function_name;
    return;
  end if;

  perform net.http_post(
    url := v_project_url || '/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := p_payload
  );
end;
$$;

revoke execute on function fn_invoke_edge_function(text, jsonb) from public, anon, authenticated;

-- ============================================================
-- Immediate dispatch: fires once per notification_outbox row inserted with
-- dispatch_mode = 'immediate' (duo/shared_flat, per fn_notify_new_assignment/
-- fn_notify_new_listing in 0004). Digest-mode rows are left alone for
-- digest-worker's hourly sweep. A plain trigger function (returns `trigger`)
-- is never PostgREST-callable regardless of GRANT, so no extra revoke is
-- needed here the way fn_invoke_edge_function needed one above.
-- ============================================================
create or replace function fn_dispatch_immediate_notification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform fn_invoke_edge_function('push-dispatch', to_jsonb(new));
  return new;
end;
$$;

create trigger trg_notification_outbox_dispatch
  after insert on notification_outbox
  for each row
  when (new.dispatch_mode = 'immediate')
  execute function fn_dispatch_immediate_notification();

-- ============================================================
-- fn_rotation_tick: catch-up pass for recurring chores whose latest
-- assignment finished (completed/skipped) without a follow-up cycle ever
-- being created. In practice this only fires for shared_flat/co_living
-- skips: fn_complete_assignment (0004) already creates the next cycle
-- synchronously on completion, and fn_skip_assignment's duo makeup case
-- does the same for duo -- neither of those leaves a chore without an
-- active (pending/in_progress) assignment. A plain shared_flat/co_living
-- skip is the one path that intentionally doesn't auto-create a follow-up
-- (per fn_skip_assignment), so this is what actually keeps those chores
-- rotating. Idempotent: the "latest assignment is completed/skipped, not
-- pending/in_progress" check means re-running it never double-creates a
-- cycle for a chore that already got one.
-- ============================================================
create or replace function fn_rotation_tick() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_chore chores%rowtype;
  v_latest assignments%rowtype;
  v_created int := 0;
begin
  for v_chore in select * from chores where is_recurring loop
    select * into v_latest from assignments
    where chore_id = v_chore.id
    order by created_at desc, rotation_cycle desc
    limit 1;

    if v_latest.id is null then
      continue; -- chore has never had an assignment created; not this job's concern
    end if;
    if v_latest.status not in ('completed', 'skipped') then
      continue; -- already has an active (or disputed) assignment
    end if;
    if v_latest.target_completion_date > now() then
      continue; -- recurrence_days hasn't elapsed yet
    end if;

    insert into assignments (
      chore_id, household_id, current_handler_id, status, rotation_cycle,
      target_completion_date
    )
    values (
      v_chore.id,
      v_latest.household_id,
      fn_next_handler(v_chore.id),
      'pending',
      v_latest.rotation_cycle + 1,
      now() + make_interval(days => coalesce(v_chore.recurrence_days, 7))
    );
    v_created := v_created + 1;
  end loop;

  return v_created;
end;
$$;

revoke execute on function fn_rotation_tick() from public, anon, authenticated;

-- ============================================================
-- Cron schedules. digest-worker runs hourly and filters by
-- households.digest_hour_local == current hour itself (plan section 5.2),
-- so it's correct to invoke it every hour regardless of any one household's
-- setting. rotation-tick runs nightly; the plan doesn't specify a time, so
-- 03:00 UTC was chosen as a low-traffic default outside the digest_hour_local
-- range any of this app's target (US) timezones would plausibly pick --
-- see docs/DECISIONS.md.
-- ============================================================
select cron.schedule('digest-worker-hourly', '0 * * * *',
  $$ select fn_invoke_edge_function('digest-worker', '{}'::jsonb) $$);

select cron.schedule('rotation-tick-nightly', '0 3 * * *',
  $$ select fn_invoke_edge_function('rotation-tick', '{}'::jsonb) $$);
