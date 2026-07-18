begin;
select plan(26);

-- ============================================================
-- Fixtures: two households (H1 duo, H2 shared_flat), three users
-- (U1, U2 in H1; U3 in H2). Inserted as the test runner's superuser
-- role, which bypasses RLS.
-- ============================================================
insert into households (id, name, roommate_count) values
  ('f1000000-0000-0000-0000-000000000001', 'Test Duo', 2),
  ('f1000000-0000-0000-0000-000000000002', 'Test Shared Flat', 3);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'f2000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'u1@rlstest.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f2000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'u2@rlstest.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f2000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'u3@rlstest.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', '');

-- trg_auth_user_created already inserted a bare profiles row (household_id null)
-- for each user above, so upsert here rather than a plain insert.
insert into profiles (id, household_id, full_name) values
  ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'U1'),
  ('f2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'U2'),
  ('f2000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000002', 'U3')
on conflict (id) do update set
  household_id = excluded.household_id,
  full_name = excluded.full_name;

insert into chores (id, household_id, title, complexity_weight) values
  ('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'H1 chore', 2),
  ('f3000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'H2 chore', 2);

insert into assignments (id, chore_id, household_id, current_handler_id, target_completion_date) values
  ('f4000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', now() + interval '1 day'),
  ('f4000000-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000003', now() + interval '1 day');

insert into audit_ledger (id, household_id, user_id, assignment_id, points_delta, entry_type) values
  ('f5000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 20, 'chore_completed'),
  ('f5000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000003', 'f4000000-0000-0000-0000-000000000002', 20, 'chore_completed');

insert into market_listings (id, household_id, assignment_id, lister_id, listing_type) values
  ('f6000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'f4000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000003', 'swap');

insert into feedback_queue (id, household_id, author_id, recipient_id, body) values
  ('f7000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000002', 'Nice work this week.');

-- notification_outbox rows already exist from trg_assignments_notify
-- (fired by the assignments inserts above); no manual insert needed.

-- ============================================================
-- Positive controls: each user can see their own household's data.
-- ============================================================
set local role authenticated;
set local request.jwt.claims to '{"sub":"f2000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select count(*)::int from households where id = 'f1000000-0000-0000-0000-000000000001'),
  1, 'U1 (H1) can see own household'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"f2000000-0000-0000-0000-000000000003","role":"authenticated"}';

select is(
  (select count(*)::int from market_listings where household_id = 'f1000000-0000-0000-0000-000000000002'),
  1, 'U3 (H2) can see own household market listing'
);

-- ============================================================
-- Cross-tenant isolation: U3 (H2) reading H1, across every table.
-- ============================================================
select is((select count(*)::int from households where id = 'f1000000-0000-0000-0000-000000000001'), 0, 'U3 cannot see H1 household');
select is((select count(*)::int from profiles where household_id = 'f1000000-0000-0000-0000-000000000001'), 0, 'U3 cannot see H1 profiles');
select is((select count(*)::int from chores where household_id = 'f1000000-0000-0000-0000-000000000001'), 0, 'U3 cannot see H1 chores');
select is((select count(*)::int from assignments where household_id = 'f1000000-0000-0000-0000-000000000001'), 0, 'U3 cannot see H1 assignments');
select is((select count(*)::int from audit_ledger where household_id = 'f1000000-0000-0000-0000-000000000001'), 0, 'U3 cannot see H1 audit_ledger');
select is((select count(*)::int from feedback_queue where household_id = 'f1000000-0000-0000-0000-000000000001'), 0, 'U3 cannot see H1 feedback_queue');
select is((select count(*)::int from notification_outbox where recipient_id = 'f2000000-0000-0000-0000-000000000001'), 0, 'U3 cannot see U1 notification_outbox rows');

-- U3 attempts to update H1's household -- RLS must silently filter it to 0 rows, not error.
-- A data-modifying CTE must be a top-level statement, so it can't be nested as a
-- scalar subquery argument to is(); stage the count in a temp table instead.
with updated as (
  update households set name = 'hacked' where id = 'f1000000-0000-0000-0000-000000000001' returning id
)
select count(*)::int as n into temp _u3_update_h1 from updated;

select is(
  (select n from _u3_update_h1),
  0, 'U3 cannot update H1 household'
);

reset role;
select is(
  (select name from households where id = 'f1000000-0000-0000-0000-000000000001'),
  'Test Duo', 'H1 household name unchanged after blocked update attempt'
);

-- ============================================================
-- Cross-tenant isolation: U1 (H1) reading H2, across every table.
-- ============================================================
set local role authenticated;
set local request.jwt.claims to '{"sub":"f2000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is((select count(*)::int from households where id = 'f1000000-0000-0000-0000-000000000002'), 0, 'U1 cannot see H2 household');
select is((select count(*)::int from profiles where household_id = 'f1000000-0000-0000-0000-000000000002'), 0, 'U1 cannot see H2 profiles');
select is((select count(*)::int from chores where household_id = 'f1000000-0000-0000-0000-000000000002'), 0, 'U1 cannot see H2 chores');
select is((select count(*)::int from assignments where household_id = 'f1000000-0000-0000-0000-000000000002'), 0, 'U1 cannot see H2 assignments');
select is((select count(*)::int from audit_ledger where household_id = 'f1000000-0000-0000-0000-000000000002'), 0, 'U1 cannot see H2 audit_ledger');
select is((select count(*)::int from market_listings where household_id = 'f1000000-0000-0000-0000-000000000002'), 0, 'U1 cannot see H2 market_listings');
select is((select count(*)::int from notification_outbox where recipient_id = 'f2000000-0000-0000-0000-000000000003'), 0, 'U1 cannot see U3 notification_outbox rows');

-- ============================================================
-- Ledger is append-only: no client insert/update/delete, even for a
-- member of the owning household.
-- ============================================================
-- throws_ok's 3-arg (sql, X, Y) overload treats X as errcode only when X is exactly 5
-- bytes, and then Y is matched as the *exact* errmsg, not a free-text description. To
-- pin the errcode while supplying our own description we need the 4-arg form with
-- errmsg explicitly NULL'd out. 42501 = permission denied, since these are blocked by
-- the missing table-level GRANT, not by RLS or a trigger.
select throws_ok(
  $$insert into audit_ledger (household_id, user_id, points_delta, entry_type) values ('f1000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000001', 100, 'chore_completed')$$,
  '42501', null,
  'U1 cannot directly insert into audit_ledger'
);
select throws_ok(
  $$update audit_ledger set points_delta = 999 where id = 'f5000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'U1 cannot update audit_ledger'
);
select throws_ok(
  $$delete from audit_ledger where id = 'f5000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'U1 cannot delete from audit_ledger'
);

-- ============================================================
-- Duo cool-off: feedback invisible to the recipient until release_at.
-- ============================================================
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"f2000000-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from feedback_queue where id = 'f7000000-0000-0000-0000-000000000001'),
  0, 'recipient cannot see feedback before release_at'
);

reset role;
update feedback_queue set release_at = now() - interval '1 minute'
  where id = 'f7000000-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims to '{"sub":"f2000000-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from feedback_queue where id = 'f7000000-0000-0000-0000-000000000001'),
  1, 'recipient can see feedback once release_at has elapsed'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"f2000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select count(*)::int from feedback_queue where id = 'f7000000-0000-0000-0000-000000000001'),
  1, 'author can always see their own sent feedback'
);

-- ============================================================
-- Profile-gating guard triggers (fn_market_guard, fn_feedback_set_release):
-- fire regardless of role, defense in depth beyond client-side gating.
-- ============================================================
reset role;
select throws_ok(
  $$insert into market_listings (household_id, assignment_id, lister_id, listing_type) values ('f1000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'swap')$$,
  'P0001', null,
  'market_listings insert blocked for a non-shared_flat household'
);
select throws_ok(
  $$insert into feedback_queue (household_id, author_id, recipient_id, body) values ('f1000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000003', 'f2000000-0000-0000-0000-000000000003', 'test')$$,
  'P0001', null,
  'feedback_queue insert blocked for a non-duo household'
);

select * from finish();
rollback;
