-- ============================================================
-- Local development seed data ONLY. This file is applied by `supabase db reset`
-- against the local Docker stack. It must never be run against the shared remote
-- project (zubxuqshcyniosmdztmw) -- see docs/DECISIONS.md.
--
-- Covers one household of each profile (duo, shared_flat, co_living), chores with
-- varied complexity_weight, a week of assignment/ledger history, and an
-- out-of-equilibrium (amber) state in both the duo and shared_flat households.
-- ============================================================

-- ------------------------------------------------------------
-- Households
-- ------------------------------------------------------------
insert into households (id, name, roommate_count) values
  ('a0000000-0000-0000-0000-000000000001', 'Alex & Bailey', 2),
  ('a0000000-0000-0000-0000-000000000002', 'The Shared Flat', 4),
  ('a0000000-0000-0000-0000-000000000003', 'Co-living Commons', 8);

-- ------------------------------------------------------------
-- Auth users (minimal rows so profiles.id can reference auth.users(id))
-- ------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'alex@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'bailey@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'casey@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'drew@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'emerson@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'frankie@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'greer@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'harper@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'indigo@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'jules@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'kit@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', 'lane@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-00000000000d', 'authenticated', 'authenticated', 'morgan@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-00000000000e', 'authenticated', 'authenticated', 'nico@seed.equilibrium.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

-- ------------------------------------------------------------
-- Profiles. trg_auth_user_created already inserted a bare row (household_id
-- null) for each user above, so upsert here instead of a plain insert. The
-- UPDATE path of trg_profiles_cohort fires on this household_id change just
-- like the INSERT path would, auto-assigning cohort_index for co_living.
-- ------------------------------------------------------------
insert into profiles (id, household_id, full_name) values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Alex'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Bailey'),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Casey'),
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Drew'),
  ('10000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Emerson'),
  ('10000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Frankie'),
  ('10000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'Greer'),
  ('10000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'Harper'),
  ('10000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'Indigo'),
  ('10000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000003', 'Jules'),
  ('10000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000003', 'Kit'),
  ('10000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000003', 'Lane'),
  ('10000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000003', 'Morgan'),
  ('10000000-0000-0000-0000-00000000000e', 'a0000000-0000-0000-0000-000000000003', 'Nico')
on conflict (id) do update set
  household_id = excluded.household_id,
  full_name = excluded.full_name;

-- ------------------------------------------------------------
-- Duo household (Alex & Bailey): chores, a week of history skewed toward Alex
-- so the pair is clearly out of equilibrium (tolerance is 15%).
-- ------------------------------------------------------------
insert into chores (id, household_id, title, definition_of_done, complexity_weight, is_recurring, recurrence_days) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Dishes', 'Sink empty, counters wiped', 2, true, 2),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Trash and recycling', 'Bins out, liners replaced', 1, true, 7);

insert into assignments (id, chore_id, household_id, current_handler_id, status, rotation_cycle, target_completion_date, completed_at) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'completed', 1, now() - interval '6 days', now() - interval '6 days'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'completed', 2, now() - interval '4 days', now() - interval '4 days'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'completed', 3, now() - interval '2 days', now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'completed', 1, now() - interval '5 days', now() - interval '5 days');

insert into assignments (id, chore_id, household_id, current_handler_id, status, rotation_cycle, target_completion_date) values
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'pending', 4, now() + interval '1 day'),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'pending', 2, now() + interval '2 days');

insert into audit_ledger (household_id, user_id, assignment_id, points_delta, entry_type) values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 20, 'chore_completed'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 20, 'chore_completed'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 20, 'chore_completed'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 10, 'chore_completed');

-- Queued feedback still inside its cool-off window (release_at is set by trigger; invisible
-- to Bailey until it elapses, matching the duo-only asynchronous feedback design).
insert into feedback_queue (household_id, author_id, recipient_id, body) values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Thanks for grabbing the trash the last few weeks -- I have got dishes covered.');

-- ------------------------------------------------------------
-- Shared flat household (4 members): one completed chore per member with
-- descending weight, producing a milder but still visible imbalance, plus an
-- open market listing (shared_flat-only feature).
-- ------------------------------------------------------------
insert into chores (id, household_id, title, definition_of_done, complexity_weight, is_recurring, recurrence_days) values
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Kitchen deep clean', 'Counters, stove, and floor', 5, true, 7),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Bathroom', 'Toilet, sink, shower, floor', 3, true, 7),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Vacuum common areas', 'Living room and hallway', 2, true, 3),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Recycling sort', 'Bins sorted and out for pickup', 1, true, 7);

insert into assignments (id, chore_id, household_id, current_handler_id, status, rotation_cycle, target_completion_date, completed_at) values
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'completed', 1, now() - interval '6 days', now() - interval '6 days'),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'completed', 1, now() - interval '5 days', now() - interval '5 days'),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'completed', 1, now() - interval '4 days', now() - interval '4 days'),
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'completed', 1, now() - interval '3 days', now() - interval '3 days');

insert into assignments (id, chore_id, household_id, current_handler_id, status, rotation_cycle, target_completion_date) values
  ('c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'pending', 2, now() + interval '1 day'),
  ('c0000000-0000-0000-0000-00000000000c', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'pending', 2, now() + interval '2 days'),
  ('c0000000-0000-0000-0000-00000000000d', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'pending', 2, now() + interval '1 day'),
  ('c0000000-0000-0000-0000-00000000000e', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'pending', 2, now() + interval '3 days');

insert into audit_ledger (household_id, user_id, assignment_id, points_delta, entry_type) values
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000007', 50, 'chore_completed'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000008', 30, 'chore_completed'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000009', 20, 'chore_completed'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-00000000000a', 10, 'chore_completed');

-- Casey lists the upcoming kitchen deep clean as an open swap.
insert into market_listings (household_id, assignment_id, lister_id, listing_type, bounty_points, is_anonymous) values
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000004', 'swap', 15, false);

-- ------------------------------------------------------------
-- Co-living household (8 members, cohorts auto-assigned on profile insert):
-- a couple of chores completed by different members plus upcoming assignments,
-- exercising digest-mode notification fan-out.
-- ------------------------------------------------------------
insert into chores (id, household_id, title, definition_of_done, complexity_weight, is_recurring, recurrence_days) values
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'Common room tidy', 'Surfaces clear, trash emptied', 3, true, 7),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'Laundry room upkeep', 'Lint traps cleared, floor swept', 2, true, 7);

insert into assignments (id, chore_id, household_id, current_handler_id, status, rotation_cycle, target_completion_date, completed_at) values
  ('c0000000-0000-0000-0000-00000000000f', 'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007', 'completed', 1, now() - interval '5 days', now() - interval '5 days'),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008', 'completed', 1, now() - interval '4 days', now() - interval '4 days');

insert into assignments (id, chore_id, household_id, current_handler_id, status, rotation_cycle, target_completion_date) values
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000009', 'pending', 2, now() + interval '2 days'),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-00000000000a', 'pending', 2, now() + interval '3 days');

insert into audit_ledger (household_id, user_id, assignment_id, points_delta, entry_type) values
  ('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-00000000000f', 30, 'chore_completed'),
  ('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000010', 20, 'chore_completed');
