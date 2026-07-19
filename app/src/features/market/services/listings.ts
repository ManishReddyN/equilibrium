import {useMutation, useQuery, useQueryClient, type UseQueryResult} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';
import type {Database} from '@lib/database.types';

export type MarketListing = Database['public']['Views']['market_listings_public']['Row'];

/**
 * `market_listings.listing_type` is a `varchar(10)` + check constraint in SQL
 * (see `supabase/migrations/0003_profile_dependent_tables.sql`), not a real
 * Postgres enum -- this union is the client-side mirror of that constraint,
 * used by the composer's segmented control.
 */
export type ListingType = 'swap' | 'drop' | 'sublet';

async function currentUserId(): Promise<string> {
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) {
    throw error ?? new Error('Not authenticated');
  }
  return data.user.id;
}

/**
 * `['market','open']` -- open listings via the anonymity-nulling view
 * (`lister_id` is already null server-side for anonymous listings, so the
 * client never has it to accidentally leak). Claim flow + listing composer
 * (`fn_claim_listing`, added in a Phase 4 migration) land in plan section 4.5;
 * this is the read side only.
 */
export function useOpenListings(): UseQueryResult<MarketListing[]> {
  return useQuery({
    queryKey: queryKeys.marketOpen(),
    queryFn: async (): Promise<MarketListing[]> => {
      const {data, error} = await supabase
        .from('market_listings_public')
        .select('*')
        .eq('status', 'open')
        .order('created_at', {ascending: false});
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });
}

export interface MyActiveAssignment {
  id: string;
  choreId: string;
  choreTitle: string;
}

/**
 * `['market','mine']` -- the signed-in user's own pending/in_progress
 * assignments, feeding the listing composer's chore picker. `ml_insert`
 * (`supabase/migrations/0005_rls.sql`) only requires `lister_id = auth.uid()`
 * and household match -- it doesn't itself require the lister to be the
 * assignment's current handler -- but listing someone else's chore out from
 * under them makes no product sense, so the client only ever offers the
 * user's own active assignments here.
 */
export function useMyActiveAssignments(): UseQueryResult<MyActiveAssignment[]> {
  return useQuery({
    queryKey: queryKeys.marketMine(),
    queryFn: async (): Promise<MyActiveAssignment[]> => {
      const userId = await currentUserId();
      const {data, error} = await supabase
        .from('assignments')
        .select('id, chore_id, chores(title)')
        .eq('current_handler_id', userId)
        .in('status', ['pending', 'in_progress'])
        .order('target_completion_date', {ascending: true});
      if (error) {
        throw error;
      }
      return (data ?? []).map(row => ({
        id: row.id,
        choreId: row.chore_id,
        choreTitle: (row.chores as unknown as {title: string} | null)?.title ?? 'Chore',
      }));
    },
  });
}

export interface CreateListingInput {
  householdId: string;
  assignmentId: string;
  listingType: ListingType;
  bountyPoints: number;
  isAnonymous: boolean;
}

/**
 * Direct insert (not an RPC) -- `ml_insert` already enforces `lister_id =
 * auth.uid()` and household scoping, and `trg_market_guard`
 * (`0004_functions_and_triggers.sql`) rejects the insert outright unless the
 * household's profile is `shared_flat`, so there's no atomicity/authorization
 * gap that would call for a security-definer wrapper the way claim/retract
 * need one.
 */
export function useCreateListing(): ReturnType<typeof useMutation<void, Error, CreateListingInput>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      householdId,
      assignmentId,
      listingType,
      bountyPoints,
      isAnonymous,
    }: CreateListingInput): Promise<void> => {
      const userId = await currentUserId();
      const {error} = await supabase.from('market_listings').insert({
        household_id: householdId,
        assignment_id: assignmentId,
        lister_id: userId,
        listing_type: listingType,
        bounty_points: bountyPoints,
        is_anonymous: isAnonymous,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.marketOpen()});
      void queryClient.invalidateQueries({queryKey: queryKeys.marketMine()});
    },
  });
}

/**
 * `fn_claim_listing` (`supabase/migrations/0007_market_claim.sql`) atomically
 * flips the listing to `claimed`, transfers `assignments.current_handler_id`,
 * and writes the paired ledger rows -- see the migration's own comments for
 * the bounty-only points-accounting decision. Invalidates every read surface
 * the RPC's side effects touch, mirroring `useCompleteAssignment` /
 * `useSkipAssignment` (`features/dashboard/services/assignments.ts`).
 */
export function useClaimListing(): ReturnType<typeof useMutation<void, Error, {listingId: string}>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({listingId}: {listingId: string}): Promise<void> => {
      const {error} = await supabase.rpc('fn_claim_listing', {p_listing_id: listingId});
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.marketOpen()});
      void queryClient.invalidateQueries({queryKey: queryKeys.assignmentsActive()});
      void queryClient.invalidateQueries({queryKey: queryKeys.ledger()});
      void queryClient.invalidateQueries({queryKey: queryKeys.equilibrium()});
    },
  });
}
