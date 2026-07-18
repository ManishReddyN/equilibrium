create table households (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null,
  roommate_count int not null check (roommate_count between 2 and 20),
  profile household_profile not null generated always as (
    case when roommate_count = 2 then 'duo'::household_profile
         when roommate_count between 3 and 5 then 'shared_flat'::household_profile
         else 'co_living'::household_profile end
  ) stored,
  cool_off_minutes int not null default 240 check (cool_off_minutes between 0 and 4320),
  equilibrium_tolerance int not null default 15 check (equilibrium_tolerance between 5 and 50),
  invite_code_hash text,                      -- sha256 of the invite secret; raw secret never stored
  invite_expires_at timestamptz,
  digest_hour_local int not null default 18 check (digest_hour_local between 0 and 23),
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  full_name varchar(80) not null,
  avatar_path text,
  push_token_ios varchar(512),
  push_token_android varchar(512),
  cohort_index int,                           -- co-living cohort assignment; null otherwise
  points_balance int not null default 0,      -- denormalized; maintained by ledger trigger
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_household on profiles(household_id);

create table chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title varchar(120) not null,
  definition_of_done text not null default '',
  baseline_photo_path text,                    -- storage path; immutable after onboarding (enforced by trigger)
  complexity_weight int not null default 1 check (complexity_weight between 1 and 10),
  is_recurring boolean not null default true,
  recurrence_days int check (recurrence_days between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_chores_household on chores(household_id);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references chores(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,  -- denormalized for cheap RLS
  current_handler_id uuid not null references profiles(id),
  status assignment_status not null default 'pending',
  rotation_cycle int not null default 1,
  is_debit_makeup boolean not null default false,   -- true when created by turn_debit enforcement
  target_completion_date timestamptz not null,
  completed_at timestamptz,
  proof_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_assignments_handler_status on assignments(current_handler_id, status);
create index idx_assignments_household_date on assignments(household_id, target_completion_date);

create table audit_ledger (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id),
  assignment_id uuid references assignments(id),
  points_delta int not null,
  entry_type ledger_entry_type not null,
  metadata jsonb not null default '{}',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_ledger_household_created on audit_ledger(household_id, created_at desc);
create index idx_ledger_user on audit_ledger(user_id);

-- Ledger is append-only: revoke UPDATE/DELETE from client roles, and enforce in depth via trigger.
revoke update, delete on audit_ledger from authenticated, anon;

create or replace function fn_ledger_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_ledger is append-only: % not permitted', tg_op;
end;
$$;

create trigger trg_ledger_no_update
  before update on audit_ledger
  for each row execute function fn_ledger_immutable();

create trigger trg_ledger_no_delete
  before delete on audit_ledger
  for each row execute function fn_ledger_immutable();
