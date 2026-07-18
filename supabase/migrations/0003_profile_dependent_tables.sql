-- Duo: asynchronous cool-off feedback queue
create table feedback_queue (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  author_id uuid not null references profiles(id),
  recipient_id uuid not null references profiles(id),
  body text not null check (char_length(body) <= 1000),
  status feedback_status not null default 'queued',
  release_at timestamptz not null,           -- now() + household.cool_off_minutes, set by trigger
  created_at timestamptz not null default now()
);

-- Shared flat: chore market
create table market_listings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,
  lister_id uuid not null references profiles(id),
  listing_type varchar(10) not null check (listing_type in ('swap','drop','sublet')),
  bounty_points int not null default 0 check (bounty_points >= 0),
  is_anonymous boolean not null default false,
  claimed_by uuid references profiles(id),
  status varchar(12) not null default 'open' check (status in ('open','claimed','settled','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Co-living: digest aggregation buffer consumed by the digest worker
create table notification_outbox (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  recipient_id uuid not null references profiles(id),
  title varchar(120) not null,
  body varchar(500) not null,
  category varchar(30) not null,
  dispatch_mode varchar(10) not null check (dispatch_mode in ('immediate','digest')),
  dispatched_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_outbox_pending on notification_outbox(recipient_id) where dispatched_at is null;
