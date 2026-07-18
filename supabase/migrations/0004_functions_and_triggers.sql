-- ============================================================
-- Generic updated_at trigger
-- ============================================================
create or replace function fn_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_households_touch before update on households
  for each row execute function fn_touch_updated_at();
create trigger trg_profiles_touch before update on profiles
  for each row execute function fn_touch_updated_at();
create trigger trg_chores_touch before update on chores
  for each row execute function fn_touch_updated_at();
create trigger trg_assignments_touch before update on assignments
  for each row execute function fn_touch_updated_at();
create trigger trg_market_listings_touch before update on market_listings
  for each row execute function fn_touch_updated_at();

-- ============================================================
-- fn_chores_baseline_immutable: enforces the "immutable after onboarding" contract
-- documented on chores.baseline_photo_path in 0002 (once set, it cannot change).
-- ============================================================
create or replace function fn_chores_baseline_immutable() returns trigger
language plpgsql as $$
begin
  if old.baseline_photo_path is not null
     and new.baseline_photo_path is distinct from old.baseline_photo_path then
    raise exception 'chores.baseline_photo_path is immutable once set';
  end if;
  return new;
end;
$$;

create trigger trg_chores_baseline_immutable
  before update on chores
  for each row execute function fn_chores_baseline_immutable();

-- ============================================================
-- fn_feedback_set_release: duo-only cool-off queue
-- ============================================================
create or replace function fn_feedback_set_release() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_profile household_profile;
  v_cool_off int;
begin
  select profile, cool_off_minutes into v_profile, v_cool_off
  from households where id = new.household_id;

  if v_profile is distinct from 'duo' then
    raise exception 'feedback_queue is only available for duo households';
  end if;

  new.release_at := now() + make_interval(mins => v_cool_off);
  return new;
end;
$$;

create trigger trg_feedback_set_release
  before insert on feedback_queue
  for each row execute function fn_feedback_set_release();

-- ============================================================
-- fn_market_guard: shared_flat-only chore market
-- ============================================================
create or replace function fn_market_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_profile household_profile;
begin
  select profile into v_profile from households where id = new.household_id;
  if v_profile is distinct from 'shared_flat' then
    raise exception 'market_listings is only available for shared_flat households';
  end if;
  return new;
end;
$$;

create trigger trg_market_guard
  before insert on market_listings
  for each row execute function fn_market_guard();

-- ============================================================
-- fn_ledger_apply: keep profiles.points_balance in sync with the ledger
-- ============================================================
create or replace function fn_ledger_apply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles
  set points_balance = points_balance + new.points_delta
  where id = new.user_id;
  return new;
end;
$$;

create trigger trg_ledger_apply
  after insert on audit_ledger
  for each row execute function fn_ledger_apply();

-- ============================================================
-- fn_next_handler: deterministic rotation (members ordered by id, modulo
-- advance). Duo households skip a candidate who already has a pending
-- back-to-back makeup obligation for a different chore.
-- ============================================================
create or replace function fn_next_handler(p_chore_id uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_household_id uuid;
  v_profile household_profile;
  v_members uuid[];
  v_member_count int;
  v_current_handler uuid;
  v_current_index int;
  v_candidate_index int;
  v_candidate uuid;
  v_has_other_makeup boolean;
  i int;
begin
  select household_id into v_household_id from chores where id = p_chore_id;
  select profile into v_profile from households where id = v_household_id;

  select array_agg(id order by id) into v_members
  from profiles where household_id = v_household_id;

  v_member_count := coalesce(array_length(v_members, 1), 0);
  if v_member_count = 0 then
    raise exception 'household % has no members', v_household_id;
  end if;

  select current_handler_id into v_current_handler
  from assignments
  where chore_id = p_chore_id
  order by created_at desc, rotation_cycle desc
  limit 1;

  if v_current_handler is null then
    return v_members[1];
  end if;

  select gs - 1 into v_current_index
  from generate_subscripts(v_members, 1) gs
  where v_members[gs] = v_current_handler;

  if v_current_index is null then
    return v_members[1];
  end if;

  for i in 1..v_member_count loop
    v_candidate_index := (v_current_index + i) % v_member_count;
    v_candidate := v_members[v_candidate_index + 1];

    if v_profile = 'duo' then
      select exists (
        select 1 from assignments a
        where a.current_handler_id = v_candidate
          and a.is_debit_makeup = true
          and a.status in ('pending', 'in_progress')
          and a.chore_id <> p_chore_id
      ) into v_has_other_makeup;
    else
      v_has_other_makeup := false;
    end if;

    if not v_has_other_makeup then
      return v_candidate;
    end if;
  end loop;

  -- every member has a conflicting makeup obligation; fall back to plain next-in-rotation
  return v_members[((v_current_index + 1) % v_member_count) + 1];
end;
$$;

-- ============================================================
-- fn_complete_assignment: RPC, single transaction
-- ============================================================
create or replace function fn_complete_assignment(p_assignment_id uuid, p_proof_path text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_assignment assignments%rowtype;
  v_chore chores%rowtype;
  v_next_handler uuid;
begin
  select * into v_assignment from assignments where id = p_assignment_id for update;
  if v_assignment.id is null then
    raise exception 'assignment % not found', p_assignment_id;
  end if;
  if v_assignment.current_handler_id <> auth.uid() then
    raise exception 'only the current handler can complete this assignment';
  end if;

  select * into v_chore from chores where id = v_assignment.chore_id;

  update assignments
  set status = 'completed',
      completed_at = now(),
      proof_photo_path = p_proof_path
  where id = p_assignment_id;

  insert into audit_ledger (household_id, user_id, assignment_id, points_delta, entry_type)
  values (
    v_assignment.household_id,
    v_assignment.current_handler_id,
    v_assignment.id,
    v_chore.complexity_weight * 10,
    'chore_completed'
  );

  if v_chore.is_recurring then
    v_next_handler := fn_next_handler(v_chore.id);

    insert into assignments (
      chore_id, household_id, current_handler_id, status, rotation_cycle,
      target_completion_date
    )
    values (
      v_chore.id,
      v_assignment.household_id,
      v_next_handler,
      'pending',
      v_assignment.rotation_cycle + 1,
      now() + make_interval(days => coalesce(v_chore.recurrence_days, 7))
    );
  end if;
end;
$$;

-- ============================================================
-- fn_skip_assignment: RPC implementing turn circumvention
-- ============================================================
create or replace function fn_skip_assignment(p_assignment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_assignment assignments%rowtype;
  v_chore chores%rowtype;
  v_household_profile household_profile;
begin
  select * into v_assignment from assignments where id = p_assignment_id for update;
  if v_assignment.id is null then
    raise exception 'assignment % not found', p_assignment_id;
  end if;
  if v_assignment.current_handler_id <> auth.uid() then
    raise exception 'only the current handler can skip this assignment';
  end if;

  select * into v_chore from chores where id = v_assignment.chore_id;
  select profile into v_household_profile from households where id = v_assignment.household_id;

  update assignments
  set status = 'skipped'
  where id = p_assignment_id;

  insert into audit_ledger (household_id, user_id, assignment_id, points_delta, entry_type)
  values (
    v_assignment.household_id,
    v_assignment.current_handler_id,
    v_assignment.id,
    -1 * v_chore.complexity_weight * 10,
    'turn_debit'
  );

  if v_household_profile = 'duo' then
    insert into assignments (
      chore_id, household_id, current_handler_id, status, rotation_cycle,
      is_debit_makeup, target_completion_date
    )
    values (
      v_chore.id,
      v_assignment.household_id,
      v_assignment.current_handler_id,
      'pending',
      v_assignment.rotation_cycle + 1,
      true,
      now() + make_interval(days => coalesce(v_chore.recurrence_days, 7))
    );
  end if;
end;
$$;

-- ============================================================
-- fn_assign_cohorts: co-living cohort grouping (ntile groups of <=5)
-- ============================================================
create or replace function fn_assign_cohorts(p_household_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_member_count int;
  v_cohort_size constant int := 5;
  v_num_cohorts int;
begin
  select count(*) into v_member_count from profiles where household_id = p_household_id;
  if v_member_count = 0 then
    return;
  end if;
  v_num_cohorts := ceil(v_member_count::numeric / v_cohort_size);

  with ranked as (
    select id, ntile(v_num_cohorts) over (order by id) as cohort
    from profiles
    where household_id = p_household_id
  )
  update profiles p
  set cohort_index = ranked.cohort - 1
  from ranked
  where p.id = ranked.id;
end;
$$;

create or replace function fn_profiles_cohort_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_profile household_profile;
begin
  if tg_op = 'INSERT' then
    if new.household_id is not null then
      select profile into v_profile from households where id = new.household_id;
      if v_profile = 'co_living' then
        perform fn_assign_cohorts(new.household_id);
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.household_id is distinct from old.household_id then
    if new.household_id is not null then
      select profile into v_profile from households where id = new.household_id;
      if v_profile = 'co_living' then
        perform fn_assign_cohorts(new.household_id);
      end if;
    end if;
    if old.household_id is not null then
      select profile into v_profile from households where id = old.household_id;
      if v_profile = 'co_living' then
        perform fn_assign_cohorts(old.household_id);
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

create trigger trg_profiles_cohort
  after insert or update of household_id on profiles
  for each row execute function fn_profiles_cohort_trigger();

-- ============================================================
-- fn_household_equilibrium: rolling 30-day positive-contribution share
-- ============================================================
create or replace function fn_household_equilibrium(p_household_id uuid)
returns table(user_id uuid, share numeric)
language sql stable security definer set search_path = public as $$
  with positive_ledger as (
    select al.user_id, sum(al.points_delta) as points
    from audit_ledger al
    where al.household_id = p_household_id
      and al.points_delta > 0
      and al.created_at >= now() - interval '30 days'
    group by al.user_id
  ),
  totals as (
    select coalesce(sum(points), 0) as total_points from positive_ledger
  )
  select p.id as user_id,
         case when t.total_points = 0 then 0
              else round(100.0 * coalesce(pl.points, 0) / t.total_points, 2)
         end as share
  from profiles p
  cross join totals t
  left join positive_ledger pl on pl.user_id = p.id
  where p.household_id = p_household_id;
$$;

-- ============================================================
-- fn_handle_new_user: bootstraps a bare profiles row for every new auth.users
-- signup. Required because profiles has no client-facing INSERT policy --
-- population happens exclusively via this trigger (household_id is set
-- afterward via fn_create_household or fn_join_household).
-- ============================================================
create or replace function fn_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function fn_handle_new_user();

-- ============================================================
-- fn_create_household: RPC, counterpart to fn_join_household for the
-- "create a new household" onboarding path.
-- ============================================================
create or replace function fn_create_household(p_name varchar(80), p_roommate_count int)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_household_id uuid;
begin
  insert into households (name, roommate_count)
  values (p_name, p_roommate_count)
  returning id into v_household_id;

  update profiles set household_id = v_household_id where id = auth.uid();

  return v_household_id;
end;
$$;

-- ============================================================
-- fn_join_household: RPC
-- ============================================================
create or replace function fn_join_household(p_invite_secret text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_household households%rowtype;
  v_member_count int;
  v_hash text;
begin
  v_hash := encode(digest(p_invite_secret, 'sha256'), 'hex');

  select * into v_household
  from households
  where invite_code_hash = v_hash
    and invite_expires_at > now()
  limit 1;

  if v_household.id is null then
    raise exception 'invalid or expired invite code';
  end if;

  select count(*) into v_member_count from profiles where household_id = v_household.id;
  if v_member_count >= v_household.roommate_count then
    raise exception 'household % is at capacity', v_household.id;
  end if;

  update profiles set household_id = v_household.id where id = auth.uid();

  if v_household.profile = 'co_living' then
    perform fn_assign_cohorts(v_household.id);
  end if;

  return v_household.id;
end;
$$;

-- ============================================================
-- fn_generate_invite: RPC restricted to current members
-- ============================================================
create or replace function fn_generate_invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_household_id uuid;
  v_secret text;
begin
  select household_id into v_household_id from profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'caller is not a member of any household';
  end if;

  v_secret := encode(gen_random_bytes(32), 'hex');

  update households
  set invite_code_hash = encode(digest(v_secret, 'sha256'), 'hex'),
      invite_expires_at = now() + interval '7 days'
  where id = v_household_id;

  return v_secret;
end;
$$;

-- ============================================================
-- Notification fan-out: immediate for duo/shared_flat, digest for co_living
-- ============================================================
create or replace function fn_notify_new_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_profile household_profile;
  v_mode varchar(10);
  v_title varchar(120);
begin
  select h.profile into v_profile from households h where h.id = new.household_id;
  v_mode := case when v_profile = 'co_living' then 'digest' else 'immediate' end;

  select c.title into v_title from chores c where c.id = new.chore_id;

  insert into notification_outbox (household_id, recipient_id, title, body, category, dispatch_mode)
  values (
    new.household_id,
    new.current_handler_id,
    'New chore assigned',
    coalesce(v_title, 'A chore') || ' is now your turn.',
    'assignment',
    v_mode
  );

  return new;
end;
$$;

create trigger trg_assignments_notify
  after insert on assignments
  for each row execute function fn_notify_new_assignment();

create or replace function fn_notify_new_listing() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_profile household_profile;
  v_mode varchar(10);
begin
  select h.profile into v_profile from households h where h.id = new.household_id;
  v_mode := case when v_profile = 'co_living' then 'digest' else 'immediate' end;

  insert into notification_outbox (household_id, recipient_id, title, body, category, dispatch_mode)
  select
    new.household_id,
    p.id,
    'New market listing',
    'A ' || new.listing_type || ' listing is open in your household.',
    'market',
    v_mode
  from profiles p
  where p.household_id = new.household_id
    and p.id <> new.lister_id;

  return new;
end;
$$;

create trigger trg_market_listings_notify
  after insert on market_listings
  for each row execute function fn_notify_new_listing();
