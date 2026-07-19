import React from 'react';
import {Text, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {EmptyState} from '@shared/components/EmptyState';
import {ArrowLeftRight} from '@theme/icons';

import {useOpenListings} from '../services/listings';

const LISTING_LABEL: Record<string, string> = {
  swap: 'Swap',
  drop: 'Drop',
  sublet: 'Sublet',
};

/**
 * shared_flat-only tab (rendered conditionally by `app/navigation/MainTabs.tsx`
 * via the profile engine). Phase 3 ships the open-listings read side; the
 * claim flow and listing composer bottom sheet (plan section 4.5, needs a new
 * `fn_claim_listing` RPC) land in Phase 4.
 */
export function MarketScreen(): React.JSX.Element {
  const listings = useOpenListings();
  const rows = listings.data ?? [];

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Chore Market</Text>

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
              <View>
                <Text className="font-sans-medium text-base text-ink">
                  {LISTING_LABEL[listing.listing_type] ?? listing.listing_type}
                </Text>
                <Text className="font-sans text-sm text-ink-muted">
                  {listing.is_anonymous ? 'Anonymous' : 'Listed by a roommate'}
                </Text>
              </View>
              {listing.bounty_points > 0 ? (
                <Text className="font-sans-semibold text-base text-primary">
                  +{listing.bounty_points}
                </Text>
              ) : null}
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
