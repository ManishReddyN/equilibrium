import React, {useMemo, useRef, useState} from 'react';
import {Alert, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';

import {Screen} from '@shared/components/Screen';
import {ListRow} from '@shared/components/ListRow';
import {SectionHeader} from '@shared/components/SectionHeader';
import {EmptyState} from '@shared/components/EmptyState';
import {useHouseholdProfile} from '@shared/hooks/useHouseholdProfile';
import {bucketDueDate, formatDueDate, type DueBucket} from '@shared/utils/dates';
import {CheckCircle2, Repeat2} from '@theme/icons';
import {colors} from '@theme/tokens';
import type {MainTabParamList} from '@app/navigation/types';

import {
  useActiveAssignments,
  useCompleteAssignment,
  useSkipAssignment,
  type ActiveAssignment,
} from '../services/assignments';
import {SwipeToComplete} from './SwipeToComplete';
import {CompletionCelebration} from './CompletionCelebration';
import {DailyProgressHeader} from './DailyProgressHeader';

const SECTION_ORDER: {bucket: DueBucket; label: string}[] = [
  {bucket: 'overdue', label: 'Overdue'},
  {bucket: 'today', label: 'Today'},
  {bucket: 'upcoming', label: 'Upcoming'},
];

/**
 * Home tab (plan section 4.1). Data layer (`useActiveAssignments` /
 * `useCompleteAssignment` / `useSkipAssignment`) is unchanged from Phase 3;
 * this rewrite adds the `SwipeToComplete` gesture, the `CompletionCelebration`
 * Skia burst (mounted only when the last assignment due *today* completes),
 * and a `DailyProgressHeader` summarizing today's remaining count.
 */
export function DashboardScreen(): React.JSX.Element {
  const assignments = useActiveAssignments();
  const completeAssignment = useCompleteAssignment();
  const skipAssignment = useSkipAssignment();
  const {data: profile} = useHouseholdProfile();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const [showCelebration, setShowCelebration] = useState(false);
  // Captured once, the first time today's assignments are known, so
  // `DailyProgressHeader` can show "X of Y done today" without a separate
  // history query -- see DailyProgressHeader.tsx.
  const initialTodayCountRef = useRef<number | null>(null);

  const sections = useMemo(() => {
    const now = new Date();
    const grouped: Record<DueBucket, ActiveAssignment[]> = {overdue: [], today: [], upcoming: []};
    for (const assignment of assignments.data ?? []) {
      const bucket = bucketDueDate(new Date(assignment.targetCompletionDate), now);
      grouped[bucket].push(assignment);
    }
    return grouped;
  }, [assignments.data]);

  if (assignments.data && initialTodayCountRef.current === null) {
    initialTodayCountRef.current = sections.today.length;
  }
  const totalToday = initialTodayCountRef.current ?? sections.today.length;
  const completedToday = Math.max(0, totalToday - sections.today.length);

  const hasAny = (assignments.data ?? []).length > 0;

  function confirmSkip(assignmentId: string): void {
    Alert.alert(
      'Skip this turn?',
      'Skipping debits your equilibrium points and creates a makeup turn.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => skipAssignment.mutate({assignmentId}),
        },
      ],
    );
  }

  function handleComplete(assignment: ActiveAssignment): void {
    const bucket = bucketDueDate(new Date(assignment.targetCompletionDate));
    const remainingToday = sections.today.filter(row => row.id !== assignment.id);
    if (bucket === 'today' && remainingToday.length === 0) {
      setShowCelebration(true);
    }
    completeAssignment.mutate({assignmentId: assignment.id});
  }

  function handleListOnMarket(): void {
    navigation.navigate('Market');
  }

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Today</Text>
      <DailyProgressHeader completedToday={completedToday} totalToday={totalToday} />

      {!hasAny && !assignments.isLoading ? (
        <EmptyState
          icon={<CheckCircle2 size={40} strokeWidth={1.75} color={colors.primary} />}
          title="All settled for today."
          subtitle="New chores appear here as they're assigned to you."
        />
      ) : null}

      {SECTION_ORDER.map(({bucket, label}) => {
        const rows = sections[bucket];
        if (rows.length === 0) {
          return null;
        }
        return (
          <View key={bucket}>
            <SectionHeader title={label} />
            <View className="gap-2 pb-2">
              {rows.map(assignment => (
                <SwipeToComplete
                  key={assignment.id}
                  onComplete={() => handleComplete(assignment)}
                  onSkip={() => confirmSkip(assignment.id)}
                  onListOnMarket={profile?.kind === 'shared_flat' ? handleListOnMarket : undefined}
                  disabled={completeAssignment.isPending || skipAssignment.isPending}>
                  <View className="px-4 py-3">
                    <ListRow
                      title={assignment.choreTitle}
                      subtitle={
                        assignment.isDebitMakeup
                          ? 'Makeup turn from skipped cycle'
                          : formatDueDate(new Date(assignment.targetCompletionDate))
                      }
                      leading={
                        assignment.isDebitMakeup ? (
                          <Repeat2 size={20} strokeWidth={1.75} color={colors.inkMuted} />
                        ) : undefined
                      }
                    />
                  </View>
                </SwipeToComplete>
              ))}
            </View>
          </View>
        );
      })}

      {showCelebration ? (
        <CompletionCelebration onDone={() => setShowCelebration(false)} />
      ) : null}
    </Screen>
  );
}
