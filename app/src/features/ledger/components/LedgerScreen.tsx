import React from 'react';
import {Text, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {SectionHeader} from '@shared/components/SectionHeader';
import {EmptyState} from '@shared/components/EmptyState';
import {useHousehold, useMembers} from '@shared/hooks/useHousehold';
import {useHouseholdProfile} from '@shared/hooks/useHouseholdProfile';
import {formatDateTime} from '@shared/utils/dates';
import {formatSignedPoints, idealShareForMemberCount} from '@shared/utils/points';
import {CheckCircle2, AlertTriangle, ArrowLeftRight} from '@theme/icons';
import type {Database} from '@lib/database.types';

import {useEquilibrium, useLedgerHistory} from '../services/ledger';
import {cohortSegments} from '../utils/balanceMath';
import {BilateralBalanceSlider} from './BilateralBalanceSlider';
import {StackedContributionBar, type ContributionSegment} from './StackedContributionBar';

type LedgerEntryType = Database['public']['Enums']['ledger_entry_type'];

// `typeof CheckCircle2` (rather than a hand-rolled ComponentType<{...}>) since
// lucide-react-native doesn't export its `LucideIcon`/`LucideProps` types --
// every icon shares that same underlying ForwardRefExoticComponent type, so
// any one of them can stand in as the Record's value type.
const ENTRY_ICON: Record<LedgerEntryType, typeof CheckCircle2> = {
  chore_completed: CheckCircle2,
  turn_debit: AlertTriangle,
  turn_credit: CheckCircle2,
  market_swap: ArrowLeftRight,
  market_bounty: ArrowLeftRight,
  market_sublet: ArrowLeftRight,
  dispute_adjustment: AlertTriangle,
  onboarding_baseline: CheckCircle2,
};

/**
 * Ledger tab (plan section 4.3). Branches on the profile engine: `duo`
 * renders `BilateralBalanceSlider`, `shared_flat` renders
 * `StackedContributionBar` with one segment per member, `co_living` renders
 * the same bar grouped into per-cohort segments (`../utils/balanceMath.ts#cohortSegments`).
 * Both visuals are Reanimated-driven; the data hooks below carry over
 * unchanged from Phase 3.
 */
export function LedgerScreen(): React.JSX.Element {
  const household = useHousehold();
  const members = useMembers();
  const {data: profile} = useHouseholdProfile();
  const equilibrium = useEquilibrium(household.data?.id);
  const history = useLedgerHistory();

  const memberRows = members.data ?? [];
  const memberNameById = new Map(memberRows.map(member => [member.id, member.full_name]));
  const idealShare = idealShareForMemberCount(memberRows.length);
  const tolerance = household.data?.equilibrium_tolerance ?? 10;
  // A member with no ledger activity yet (brand-new household) previews at
  // the ideal even split rather than 0, so the visuals don't open looking
  // maximally out-of-equilibrium before any chore has ever been completed.
  const shareById = new Map((equilibrium.data ?? []).map(entry => [entry.userId, entry.share]));
  const shareFor = (memberId: string): number => shareById.get(memberId) ?? idealShare;

  const hasEquilibriumData = memberRows.length > 0 && profile !== undefined;
  const memberA = memberRows[0];
  const memberB = memberRows[1];

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Equilibrium</Text>

      <SectionHeader title="Contribution share" />
      {!hasEquilibriumData ? (
        <Card className="gap-3">
          <Text className="font-sans text-sm text-ink-muted">No activity yet.</Text>
        </Card>
      ) : profile?.kind === 'duo' && memberA && memberB ? (
        <Card>
          <BilateralBalanceSlider
            memberAName={memberA.full_name}
            memberBName={memberB.full_name}
            memberAShare={shareFor(memberA.id)}
            tolerancePercent={tolerance}
          />
        </Card>
      ) : profile?.kind === 'co_living' ? (
        <Card>
          <StackedContributionBar
            segments={cohortSegments(
              memberRows.map(member => ({
                id: member.id,
                name: member.full_name,
                share: shareFor(member.id),
                cohortIndex: member.cohort_index,
              })),
            )}
            tolerancePercent={tolerance}
          />
        </Card>
      ) : (
        <Card>
          <StackedContributionBar
            segments={memberRows.map<ContributionSegment>(member => ({
              key: member.id,
              label: member.full_name,
              share: shareFor(member.id),
              idealShare,
            }))}
            tolerancePercent={tolerance}
          />
        </Card>
      )}

      <SectionHeader title="History" />
      {(history.data ?? []).length === 0 && !history.isLoading ? (
        <EmptyState title="No ledger entries yet." subtitle="Completed chores will show up here." />
      ) : (
        <Card className="gap-1">
          {(history.data ?? []).map((entry, index) => {
            const Icon = ENTRY_ICON[entry.entry_type];
            return (
              <View
                key={entry.id}
                className={`flex-row items-center gap-3 py-2 ${index > 0 ? 'border-t border-border' : ''}`}>
                <Icon size={20} strokeWidth={1.75} color="#64748B" />
                <View className="flex-1">
                  <Text className="font-sans-medium text-base text-ink">
                    {memberNameById.get(entry.user_id) ?? 'Member'}
                  </Text>
                  <Text className="font-sans text-xs text-ink-muted">
                    {formatDateTime(new Date(entry.created_at))}
                  </Text>
                </View>
                <Text
                  className={`font-sans-semibold text-base ${
                    entry.points_delta > 0 ? 'text-primary' : 'text-ink-muted'
                  }`}>
                  {formatSignedPoints(entry.points_delta)}
                </Text>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
