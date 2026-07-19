import {useQuery, type UseQueryResult} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';
import {queryKeys} from '@lib/queryKeys';
import type {Database} from '@lib/database.types';

export type MarketListing = Database['public']['Views']['market_listings_public']['Row'];

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
