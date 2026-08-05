-- Bug: nothing ever created a chore's *first* assignment. fn_complete_assignment
-- and fn_skip_assignment only ever insert a *follow-up* assignment once an
-- existing one resolves, and fn_rotation_tick explicitly skips chores with no
-- assignment history at all ("chore has never had an assignment created; not
-- this job's concern" -- migration 0008). Confirmed live: a household with one
-- chore ("Vacuum") and zero rows in `assignments`, so the dashboard's "All
-- settled for today" was correct given the data, but the data itself was
-- wrong -- there was never anything to settle in the first place.
--
-- Fix: a trigger creates the first `pending` assignment the moment a chore is
-- inserted, reusing fn_next_handler (already handles "no prior assignment"
-- by returning the first member) and the same rotation_cycle=1/target_date
-- shape fn_complete_assignment/fn_skip_assignment/fn_rotation_tick already use
-- for follow-up cycles. `chores` grants `authenticated` insert directly (no
-- RPC wrapper -- see migration 0005), but `assignments` grants `authenticated`
-- select only, so this trigger function must be security definer to write the
-- bootstrap row.
create or replace function fn_bootstrap_chore_assignment() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into assignments (
    chore_id, household_id, current_handler_id, target_completion_date
  )
  values (
    new.id,
    new.household_id,
    fn_next_handler(new.id),
    now() + make_interval(days => coalesce(new.recurrence_days, 7))
  );
  return new;
end;
$$;

create trigger trg_chores_bootstrap_assignment
  after insert on chores
  for each row execute function fn_bootstrap_chore_assignment();

-- Backfill: any chore already created before this trigger existed and still
-- has zero assignments (confirmed live: exactly one, "Vacuum") gets its first
-- assignment now, via the same logic the trigger above uses.
insert into assignments (chore_id, household_id, current_handler_id, target_completion_date)
select
  c.id,
  c.household_id,
  fn_next_handler(c.id),
  now() + make_interval(days => coalesce(c.recurrence_days, 7))
from chores c
left join assignments a on a.chore_id = c.id
where a.id is null;
