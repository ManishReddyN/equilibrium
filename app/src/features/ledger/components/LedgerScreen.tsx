import React from 'react';
import {Text, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {SectionHeader} from '@shared/components/SectionHeader';
import {Avatar} from '@shared/components/Avatar';
import {EmptyState} from '@shared/components/EmptyState';
import {useHousehold, useMembers} from '@shared/hooks/useHousehold';
import {formatDateTime} from '@shared/utils/dates';
import {
  formatShare,
  formatSignedPoints,
  idealShareForMemberCount,
  isOutOfEquilibrium,
} from '@shared/utils/points';
import {CheckCircle2, AlertTriangle, ArrowLeftRight, Scale} from '@theme/icons';
import type {Database} from '@lib/database.types';

import {useEquilibrium, useLedgerHistory} from '../services/ledger';

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
 * Ledger tab -- Phase 3 renders a plain share list + history (real data).
 * Phase 4.3 branches on the profile engine to swap this for
 * `BilateralBalanceSlider` (duo) / `StackedContributionBar` (3+), both
 * Reanimated-driven; the data hooks here carry over unchanged.
 */
export function LedgerScreen(): React.JSX.Element {
  const household = useHousehold();
  const members = useMembers();
  const equilibrium = useEquilibrium(household.data?.id);
  const history = useLedgerHistory();

  const memberNameById = new Map((members.data ?? []).map(member => [member.id, member.full_name]));
  const idealShare = idealShareForMemberCount((members.data ?? []).length);
  const tolerance = household.data?.equilibrium_tolerance ?? 10;

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Equilibrium</Text>

      <SectionHeader title="Contribution share" />
      <Card className="gap-3">
        {(equilibrium.data ?? []).length === 0 ? (
          <Text className="font-sans text-sm text-ink-muted">No activity yet.</Text>
        ) : (
          (equilibrium.data ?? []).map(entry => {
            const outOfEquilibrium = isOutOfEquilibrium(entry.share, idealShare, tolerance);
            return (
              <View key={entry.userId} className="flex-row items-center gap-3">
                <Avatar name={memberNameById.get(entry.userId) ?? '?'} size={32} />
                <Text className="flex-1 font-sans-medium text-base text-ink">
                  {memberNameById.get(entry.userId) ?? 'Member'}
                </Text>
                <View className="flex-row items-center gap-1">
                  {outOfEquilibrium ? (
                    <Scale size={16} strokeWidth={1.75} color="#D97706" />
                  ) : null}
                  <Text
                    className={`font-sans-semibold text-base ${
                      outOfEquilibrium ? 'text-warn' : 'text-ink'
                    }`}>
                    {formatShare(entry.share)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

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
