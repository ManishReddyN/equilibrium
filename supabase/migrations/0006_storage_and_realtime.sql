-- ============================================================
-- Storage buckets (all private; access mediated entirely by RLS policies below)
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('baseline-photos', 'baseline-photos', false),
  ('proof-photos', 'proof-photos', false),
  ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- ============================================================
-- baseline-photos: path convention household_id/chore_id.jpg
-- Immutable: exactly one insert per path, no update, no delete via client roles.
-- Select: household members only.
-- ============================================================
create policy baseline_photos_select on storage.objects for select
  using (
    bucket_id = 'baseline-photos'
    and split_part(name, '/', 1)::uuid = fn_my_household()
  );

create policy baseline_photos_insert on storage.objects for insert
  with check (
    bucket_id = 'baseline-photos'
    and split_part(name, '/', 1)::uuid = fn_my_household()
    and not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'baseline-photos' and o.name = storage.objects.name
    )
  );
-- No update/delete policies for baseline-photos: absence of a permissive policy denies the
-- operation outright under RLS, enforcing immutability in depth alongside the app-level rule.

-- ============================================================
-- proof-photos: member-scoped select, insert restricted to the assignment's current handler.
-- Path convention household_id/assignment_id.jpg
-- ============================================================
create policy proof_photos_select on storage.objects for select
  using (
    bucket_id = 'proof-photos'
    and split_part(name, '/', 1)::uuid = fn_my_household()
  );

create policy proof_photos_insert on storage.objects for insert
  with check (
    bucket_id = 'proof-photos'
    and split_part(name, '/', 1)::uuid = fn_my_household()
    and exists (
      select 1 from assignments a
      where a.id::text = split_part(name, '/', 2)
        and a.current_handler_id = auth.uid()
    )
  );

-- ============================================================
-- avatars: member-scoped read, owner-scoped write.
-- Path convention user_id/avatar.jpg
-- ============================================================
create policy avatars_select on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (
      split_part(name, '/', 1)::uuid = auth.uid()
      or split_part(name, '/', 1)::uuid in (
        select id from profiles where household_id = fn_my_household()
      )
    )
  );

create policy avatars_insert on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1)::uuid = auth.uid()
  );

create policy avatars_update on storage.objects for update
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1)::uuid = auth.uid()
  );

create policy avatars_delete on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1)::uuid = auth.uid()
  );

-- ============================================================
-- Realtime: postgres_changes on the tables the plan calls out (2.8). RLS applies
-- automatically to realtime broadcasts on tables added to this publication.
-- ============================================================
alter publication supabase_realtime add table assignments;
alter publication supabase_realtime add table market_listings;
alter publication supabase_realtime add table audit_ledger;
alter publication supabase_realtime add table feedback_queue;
