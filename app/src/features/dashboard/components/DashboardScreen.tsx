import React, {useMemo} from 'react';
import {Alert, Text, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {ListRow} from '@shared/components/ListRow';
import {SectionHeader} from '@shared/components/SectionHeader';
import {EmptyState} from '@shared/components/EmptyState';
import {Button} from '@shared/components/Button';
import {bucketDueDate, formatDueDate, type DueBucket} from '@shared/utils/dates';
import {CheckCircle2, Repeat2} from '@theme/icons';

import {
  useActiveAssignments,
  useCompleteAssignment,
  useSkipAssignment,
  type ActiveAssignment,
} from '../services/assignments';

const SECTION_ORDER: {bucket: DueBucket; label: string}[] = [
  {bucket: 'overdue', label: 'Overdue'},
  {bucket: 'today', label: 'Today'},
  {bucket: 'upcoming', label: 'Upcoming'},
];

/**
 * Home tab -- Phase 3 ships a plain, fully functional list (real data, real
 * complete/skip mutations); Phase 4.1 replaces the trailing buttons with
 * `SwipeToComplete` (Reanimated gesture) and adds `CompletionCelebration`
 * (Skia) per the execution plan, without touching the data layer here.
 */
export function DashboardScreen(): React.JSX.Element {
  const assignments = useActiveAssignments();
  const completeAssignment = useCompleteAssignment();
  const skipAssignment = useSkipAssignment();

  const sections = useMemo(() => {
    const now = new Date();
    const grouped: Record<DueBucket, ActiveAssignment[]> = {overdue: [], today: [], upcoming: []};
    for (const assignment of assignments.data ?? []) {
      const bucket = bucketDueDate(new Date(assignment.targetCompletionDate), now);
      grouped[bucket].push(assignment);
    }
    return grouped;
  }, [assignments.data]);

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

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Today</Text>

      {!hasAny && !assignments.isLoading ? (
        <EmptyState
          icon={<CheckCircle2 size={40} strokeWidth={1.75} color="#0D9488" />}
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
            <Card className="gap-1">
              {rows.map((assignment, index) => (
                <View
                  key={assignment.id}
                  className={index > 0 ? 'border-t border-border pt-1' : ''}>
                  <ListRow
                    title={assignment.choreTitle}
                    subtitle={
                      assignment.isDebitMakeup
                        ? 'Makeup turn from skipped cycle'
                        : formatDueDate(new Date(assignment.targetCompletionDate))
                    }
                    leading={
                      assignment.isDebitMakeup ? (
                        <Repeat2 size={20} strokeWidth={1.75} color="#64748B" />
                      ) : undefined
                    }
                    trailing={
                      <View className="flex-row gap-2">
                        <Button
                          label="Skip"
                          variant="secondary"
                          onPress={() => confirmSkip(assignment.id)}
                          disabled={skipAssignment.isPending}
                          className="px-3 py-2"
                        />
                        <Button
                          label="Done"
                          onPress={() => completeAssignment.mutate({assignmentId: assignment.id})}
                          disabled={completeAssignment.isPending}
                          className="px-3 py-2"
                        />
                      </View>
                    }
                  />
                </View>
              ))}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}
