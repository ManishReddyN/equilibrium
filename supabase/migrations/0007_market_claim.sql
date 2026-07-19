-- ============================================================
-- Phase 4 section 4.5: fn_claim_listing / fn_retract_feedback.
--
-- The plan's literal filename for this migration ("0006_market_claim.sql")
-- is stale -- migrations 0000-0006 are already taken (see docs/DECISIONS.md),
-- so this lands as 0007. Both RPCs follow the exact conventions established
-- in 0004_functions_and_triggers.sql: `p_`/`v_` naming, row-lock the target
-- with `select ... for update`, authorize via `auth.uid()` with a plain
-- `raise exception`, no explicit `grant execute` (functions are executable by
-- PUBLIC by default in every prior migration).
-- ============================================================

-- ============================================================
-- fn_claim_listing: atomically claims an open market listing --
-- transfers assignments.current_handler_id to the claimer and writes a
-- ledger row for both parties (plan section 4.5's literal requirement).
--
-- Design decisions (no explicit spec in the plan beyond "transfers
-- current_handler_id, writes market_swap/market_bounty ledger rows for both
-- parties atomically" -- logged in docs/DECISIONS.md):
--   - The listing's `bounty_points` (set by the composer's bounty stepper,
--     defaulting to 0) is the only immediate points transfer -- it is the
--     lister's explicit payment to whoever takes the chore off their hands.
--     The chore's own point value (chores.complexity_weight * 10) is never
--     duplicated here; it is still earned exactly once, later, by whichever
--     handler actually completes the assignment via fn_complete_assignment.
--   - entry_type: 'sublet' listings always use 'market_sublet' (a distinct
--     category regardless of bounty); otherwise 'market_bounty' when
--     bounty_points > 0, else 'market_swap' (covers swap/drop with no
--     bounty). Both ledger rows (claimer +bounty_points, lister
--     -bounty_points) always get written, even when bounty_points = 0, so
--     the event still shows up in ledger history (LedgerScreen's
--     ENTRY_ICON already maps all three market_* types).
-- ============================================================
create or replace function fn_claim_listing(p_listing_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_listing market_listings%rowtype;
  v_assignment assignments%rowtype;
  v_entry_type ledger_entry_type;
begin
  select * into v_listing from market_listings where id = p_listing_id for update;
  if v_listing.id is null then
    raise exception 'listing % not found', p_listing_id;
  end if;
  if v_listing.household_id <> fn_my_household() then
    raise exception 'listing % is not in your household', p_listing_id;
  end if;
  if v_listing.status <> 'open' then
    raise exception 'listing is no longer open';
  end if;
  if v_listing.lister_id = auth.uid() then
    raise exception 'you cannot claim your own listing';
  end if;

  select * into v_assignment from assignments where id = v_listing.assignment_id for update;
  if v_assignment.id is null then
    raise exception 'assignment % not found', v_listing.assignment_id;
  end if;
  if v_assignment.status not in ('pending', 'in_progress') then
    raise exception 'the underlying assignment is no longer active';
  end if;

  update market_listings
  set status = 'claimed', claimed_by = auth.uid()
  where id = p_listing_id;

  update assignments
  set current_handler_id = auth.uid()
  where id = v_listing.assignment_id;

  v_entry_type := case
    when v_listing.listing_type = 'sublet' then 'market_sublet'
    when v_listing.bounty_points > 0 then 'market_bounty'
    else 'market_swap'
  end;

  insert into audit_ledger (household_id, user_id, assignment_id, points_delta, entry_type, metadata)
  values (
    v_listing.household_id,
    auth.uid(),
    v_listing.assignment_id,
    v_listing.bounty_points,
    v_entry_type,
    jsonb_build_object('market_listing_id', v_listing.id)
  );

  insert into audit_ledger (household_id, user_id, assignment_id, points_delta, entry_type, metadata)
  values (
    v_listing.household_id,
    v_listing.lister_id,
    v_listing.assignment_id,
    -v_listing.bounty_points,
    v_entry_type,
    jsonb_build_object('market_listing_id', v_listing.id)
  );
end;
$$;

-- ============================================================
-- fn_retract_feedback: flips a queued feedback item to 'retracted'.
-- feedback_queue only has select/insert grants (0005_rls.sql) and no
-- UPDATE policy at all, so this is the only way a client can ever change
-- `status` -- matches the assignments table's "insert/update only via
-- security-definer RPC" precedent.
-- ============================================================
create or replace function fn_retract_feedback(p_feedback_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_feedback feedback_queue%rowtype;
begin
  select * into v_feedback from feedback_queue where id = p_feedback_id for update;
  if v_feedback.id is null then
    raise exception 'feedback % not found', p_feedback_id;
  end if;
  if v_feedback.author_id <> auth.uid() then
    raise exception 'only the author can retract this feedback';
  end if;
  if v_feedback.status <> 'queued' then
    raise exception 'feedback can only be retracted while queued';
  end if;

  update feedback_queue set status = 'retracted' where id = p_feedback_id;
end;
$$;
