/**
 * Listing composer bottom sheet (plan section 4.5): pick one of your own
 * active assignments, choose Swap / Drop / Sublet, set an optional bounty,
 * and toggle anonymity, then insert via `useCreateListing`.
 *
 * No bottom-sheet/modal library or pattern exists anywhere else in this
 * codebase (confirmed by grep before writing this file), so this is
 * hand-rolled from RN's own `Modal` (`transparent`, `animationType="none"`)
 * plus a Reanimated `translateY` spring/timing and a Gesture Handler pan for
 * drag-to-dismiss -- the same primitives `SwipeToComplete`
 * (`features/dashboard/components/SwipeToComplete.tsx`) already uses
 * elsewhere in Phase 4, rather than introducing a new dependency for one sheet.
 */
import React, {useEffect, useState} from 'react';
import {Modal, Pressable, ScrollView, Switch, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {Button} from '@shared/components/Button';
import {EmptyState} from '@shared/components/EmptyState';
import {useHousehold} from '@shared/hooks/useHousehold';
import {colors} from '@theme/tokens';
import {MinusCircle, PlusCircle, X} from '@theme/icons';

import {useCreateListing, useMyActiveAssignments, type ListingType} from '../services/listings';

interface ListingComposerSheetProps {
  visible: boolean;
  onClose: () => void;
}

const LISTING_TYPES: {value: ListingType; label: string}[] = [
  {value: 'swap', label: 'Swap'},
  {value: 'drop', label: 'Drop'},
  {value: 'sublet', label: 'Sublet'},
];

// Bounty stepper increments by 5 points at a time (no exact value specified
// in the plan beyond "bounty stepper" -- logged in docs/DECISIONS.md). The
// underlying column only requires a non-negative int (`bounty_points >= 0`
// check constraint, 0003_profile_dependent_tables.sql).
const BOUNTY_STEP = 5;

// Larger than any device height, so the sheet is fully off-screen when closed
// regardless of its measured content height.
const SHEET_CLOSED_OFFSET = 900;
const DRAG_DISMISS_THRESHOLD = 100;

export function ListingComposerSheet({visible, onClose}: ListingComposerSheetProps): React.JSX.Element {
  const household = useHousehold();
  const myAssignments = useMyActiveAssignments();
  const createListing = useCreateListing();

  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [listingType, setListingType] = useState<ListingType>('swap');
  const [bountyPoints, setBountyPoints] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const translateY = useSharedValue(SHEET_CLOSED_OFFSET);

  useEffect(() => {
    translateY.value = visible ? withSpring(0, {damping: 20}) : SHEET_CLOSED_OFFSET;
  }, [visible, translateY]);

  function resetForm(): void {
    setAssignmentId(null);
    setListingType('swap');
    setBountyPoints(0);
    setIsAnonymous(false);
  }

  function dismiss(): void {
    translateY.value = withTiming(SHEET_CLOSED_OFFSET, {duration: 180}, finished => {
      if (finished) {
        runOnJS(resetForm)();
        runOnJS(onClose)();
      }
    });
  }

  const pan = Gesture.Pan()
    .onUpdate(event => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd(event => {
      if (event.translationY > DRAG_DISMISS_THRESHOLD) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, {damping: 20});
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  function handleSubmit(): void {
    if (!household.data || !assignmentId) {
      return;
    }
    createListing.mutate(
      {householdId: household.data.id, assignmentId, listingType, bountyPoints, isAnonymous},
      {onSuccess: dismiss},
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0"
          // Plain style, not a className, for the same reason Screen.tsx's
          // contentContainerStyle is: NativeWind has no built-in
          // color-opacity utility wired up for this custom theme.
          // eslint-disable-next-line react-native/no-inline-styles
          style={{backgroundColor: 'rgba(15, 23, 42, 0.4)'}}
          onPress={dismiss}
        />
        <GestureDetector gesture={pan}>
          <Animated.View
            style={sheetStyle}
            className="max-h-[85%] rounded-t-card border border-border bg-white px-4 pb-8 pt-3">
            <View className="items-center pb-2">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>
            <View className="flex-row items-center justify-between pb-3">
              <Text className="font-sans-bold text-xl text-ink">List a chore</Text>
              <Pressable onPress={dismiss} hitSlop={12}>
                <X size={22} strokeWidth={1.75} color={colors.inkMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="pb-2 font-sans-medium text-sm text-ink">Which chore?</Text>
              {(myAssignments.data ?? []).length === 0 && !myAssignments.isLoading ? (
                <EmptyState
                  title="No active chores to list."
                  subtitle="You'll be able to list a chore once one is assigned to you."
                />
              ) : (
                <View className="gap-2 pb-4">
                  {(myAssignments.data ?? []).map(assignment => {
                    const selected = assignment.id === assignmentId;
                    return (
                      <Pressable
                        key={assignment.id}
                        onPress={() => setAssignmentId(assignment.id)}
                        className={`rounded-control border px-4 py-3 ${
                          selected ? 'border-primary bg-primary-soft' : 'border-border'
                        }`}>
                        <Text
                          className={`font-sans-medium text-base ${selected ? 'text-primary' : 'text-ink'}`}>
                          {assignment.choreTitle}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text className="pb-2 font-sans-medium text-sm text-ink">Listing type</Text>
              <View className="mb-4 flex-row gap-2">
                {LISTING_TYPES.map(option => {
                  const selected = option.value === listingType;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setListingType(option.value)}
                      className={`flex-1 items-center rounded-control border px-3 py-2 ${
                        selected ? 'border-primary bg-primary-soft' : 'border-border'
                      }`}>
                      <Text
                        className={`font-sans-medium text-sm ${
                          selected ? 'text-primary' : 'text-ink-muted'
                        }`}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="pb-2 font-sans-medium text-sm text-ink">Bounty points</Text>
              <View className="mb-4 flex-row items-center gap-4">
                <Pressable
                  onPress={() => setBountyPoints(current => Math.max(0, current - BOUNTY_STEP))}
                  disabled={bountyPoints === 0}
                  hitSlop={8}>
                  <MinusCircle
                    size={28}
                    strokeWidth={1.75}
                    color={bountyPoints === 0 ? colors.border : colors.primary}
                  />
                </Pressable>
                <Text className="min-w-[40px] text-center font-sans-bold text-lg text-ink">
                  {bountyPoints}
                </Text>
                <Pressable onPress={() => setBountyPoints(current => current + BOUNTY_STEP)} hitSlop={8}>
                  <PlusCircle size={28} strokeWidth={1.75} color={colors.primary} />
                </Pressable>
              </View>

              <View className="mb-6 flex-row items-center justify-between">
                <Text className="font-sans-medium text-sm text-ink">List anonymously</Text>
                <Switch
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{false: colors.border, true: colors.primarySoft}}
                  thumbColor={isAnonymous ? colors.primary : '#FFFFFF'}
                />
              </View>

              <Button
                label={createListing.isPending ? 'Listing...' : 'List chore'}
                onPress={handleSubmit}
                disabled={createListing.isPending || !assignmentId}
              />
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
