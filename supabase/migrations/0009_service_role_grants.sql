-- ============================================================
-- service_role (used exclusively by trusted backend/edge-function code --
-- supabase/functions/_shared/supabaseAdmin.ts -- never exposed to end-user
-- clients) needs explicit grants the same way anon/authenticated do. Confirmed
-- via config.toml's own [api] comment: "new tables, views, sequences and
-- functions ... are NOT auto-exposed [to anon/authenticated/service_role]
-- without explicit GRANTs" is this project's actual (current, non-legacy)
-- Supabase behavior -- every prior migration remembered anon/authenticated but
-- never service_role.
--
-- Discovered by actually exercising Phase 5's edge functions against this
-- schema for the first time (a real Android emulator test, not a lint/tsc
-- check): querying `profiles` as service_role failed with "permission denied
-- for table profiles" -- service_role had only the baseline
-- TRUNCATE/REFERENCES/TRIGGER/MAINTAIN grant every role gets by default, same
-- as anon's own equally-bare baseline, no SELECT/INSERT/UPDATE/DELETE at all
-- on any table. Separately, 0008's `revoke execute ... from public, anon,
-- authenticated` on fn_invoke_edge_function/fn_rotation_tick also stripped
-- service_role's access to call them: that revoke removed the implicit
-- PUBLIC-inherited EXECUTE every role (service_role included) was relying on,
-- and nothing re-granted it back explicitly. All three Phase 5 edge functions
-- would have failed with "permission denied" the moment any of them actually
-- ran, e.g. push-dispatch's UPDATE on notification_outbox to stamp
-- dispatched_at, digest-worker's SELECT on households/profiles, rotation-tick's
-- `rpc('fn_rotation_tick')` call.
--
-- Blanket and schema-wide (current tables/functions/sequences, and future ones
-- via ALTER DEFAULT PRIVILEGES) rather than naming things one by one: service_role
-- is the one fully-trusted backend identity in this schema, so there's no
-- meaningful extra risk from it also being able to reach tables/functions
-- unrelated to today's three edge functions -- and naming them one by one just
-- means the next new table silently repeats this exact bug.
-- ============================================================
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
