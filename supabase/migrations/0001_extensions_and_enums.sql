create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create type assignment_status as enum ('pending','in_progress','completed','skipped','disputed');
create type ledger_entry_type as enum (
  'chore_completed','turn_debit','turn_credit','market_swap','market_bounty',
  'market_sublet','dispute_adjustment','onboarding_baseline'
);
create type household_profile as enum ('duo','shared_flat','co_living');
create type feedback_status as enum ('queued','released','read','retracted');
