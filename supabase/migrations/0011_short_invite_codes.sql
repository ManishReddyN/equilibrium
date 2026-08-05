-- fn_generate_invite previously returned a 64-char hex secret meant for a
-- `equilibrium://join?code=...` deep link. Product direction changed: invites
-- are now shared as a plain 8-digit code the recipient types into
-- JoinHouseholdScreen's existing manual-entry field (no link, no deep-link
-- dependency). fn_join_household is unchanged -- it already just hashes
-- whatever text it's given and compares, so it works with any code format.
create or replace function fn_generate_invite() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_household_id uuid;
  v_secret text;
begin
  select household_id into v_household_id from profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'caller is not a member of any household';
  end if;

  v_secret := lpad(floor(random() * 100000000)::text, 8, '0');

  update households
  set invite_code_hash = encode(digest(v_secret, 'sha256'), 'hex'),
      invite_expires_at = now() + interval '7 days'
  where id = v_household_id;

  return v_secret;
end;
$$;
