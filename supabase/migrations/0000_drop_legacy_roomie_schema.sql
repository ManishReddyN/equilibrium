-- Drop the legacy "roomie" schema (Expo/Next.js chore app) before rebuilding this project's
-- schema from scratch in the same Supabase project. Uses IF EXISTS / CASCADE throughout because
-- the live database drifted from the old repo's committed supabase/schema.sql (e.g.
-- get_my_household_id() was added via ad-hoc SQL and never committed there).

drop table if exists chore_log cascade;
drop table if exists chores cascade;
drop table if exists roommates cascade;
drop table if exists households cascade;

drop function if exists is_household_member(uuid);
drop function if exists get_my_household_id();
