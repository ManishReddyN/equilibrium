import React, {useState} from 'react';
import {Alert, Pressable, Text, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {EmptyState} from '@shared/components/EmptyState';
import {ArrowLeftRight, Plus} from '@theme/icons';
import {colors} from '@theme/tokens';

import {useClaimListing, useOpenListings} from '../services/listings';
import {ListingComposerSheet} from './ListingComposerSheet';

const LISTING_LABEL: Record<string, string> = {
  swap: 'Swap',
  drop: 'Drop',
  sublet: 'Sublet',
};

/**
 * shared_flat-only tab (rendered conditionally by `app/navigation/MainTabs.tsx`
 * via the profile engine). Read side (open listings) shipped in Phase 3; this
 * rewrite adds the "+" listing composer trigger (`ListingComposerSheet`) and
 * the claim flow -- confirm via `Alert` (mirrors `DashboardScreen`'s
 * `confirmSkip` pattern), then `fn_claim_listing`
 * (`supabase/migrations/0007_market_claim.sql`) via `useClaimListing`.
 *
 * The claim button is shown on every row regardless of who listed it --
 * `lister_id` is nulled server-side on anonymous listings
 * (`market_listings_public`, 0005_rls.sql), so the client can't always tell
 * "is this my own listing" to hide the button proactively. `fn_claim_listing`
 * itself rejects a self-claim (raises), which surfaces through the `Alert` on
 * failure -- server-side authorization, not client-side hiding, is the real
 * enforcement here (same invariant plan section 3.4 states for profile gating).
 */
export function MarketScreen(): React.JSX.Element {
  const listings = useOpenListings();
  const claimListing = useClaimListing();
  const [showComposer, setShowComposer] = useState(false);
  const rows = listings.data ?? [];

  function confirmClaim(listingId: string): void {
    Alert.alert('Claim this listing?', 'The chore (and any bounty) transfers to you immediately.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Claim',
        onPress: () =>
          claimListing.mutate(
            {listingId},
            {
              onError: error => Alert.alert('Could not claim listing', error.message),
            },
          ),
      },
    ]);
  }

  return (
    <Screen scrollable>
      <View className="flex-row items-center justify-between pt-4">
        <Text className="font-sans-bold text-2xl text-ink">Chore Market</Text>
        <Pressable
          onPress={() => setShowComposer(true)}
          accessibilityRole="button"
          accessibilityLabel="List a chore"
          className="h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
          <Plus size={22} strokeWidth={1.75} color={colors.primary} />
        </Pressable>
      </View>

      {rows.length === 0 && !listings.isLoading ? (
        <EmptyState
          icon={<ArrowLeftRight size={40} strokeWidth={1.75} color="#0D9488" />}
          title="No open listings."
          subtitle="Chores listed for swap, drop, or sublet appear here."
        />
      ) : (
        <Card className="mt-4 gap-1">
          {rows.map((listing, index) => (
            <View
              key={listing.id}
              className={`flex-row items-center justify-between py-2 ${
                index > 0 ? 'border-t border-border' : ''
              }`}>
              <View className="flex-1">
                <Text className="font-sans-medium text-base text-ink">
                  {LISTING_LABEL[listing.listing_type] ?? listing.listing_type}
                </Text>
                <Text className="font-sans text-sm text-ink-muted">
                  {listing.is_anonymous ? 'Anonymous' : 'Listed by a roommate'}
                  {listing.bounty_points > 0 ? ` · +${listing.bounty_points} pts` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmClaim(listing.id)}
                disabled={claimListing.isPending}
                className={`rounded-control bg-primary-soft px-3 py-2 ${
                  claimListing.isPending ? 'opacity-50' : ''
                }`}>
                <Text className="font-sans-semibold text-sm text-primary">Claim</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      <ListingComposerSheet visible={showComposer} onClose={() => setShowComposer(false)} />
    </Screen>
  );
}
