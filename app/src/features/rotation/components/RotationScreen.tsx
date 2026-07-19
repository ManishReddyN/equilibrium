import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {ListRow} from '@shared/components/ListRow';
import {Avatar} from '@shared/components/Avatar';
import {SectionHeader} from '@shared/components/SectionHeader';
import {EmptyState} from '@shared/components/EmptyState';
import {useMembers} from '@shared/hooks/useHousehold';
import {useHouseholdProfile} from '@shared/hooks/useHouseholdProfile';
import {
  hasMakeupObligationForChore,
  projectUpcomingHandlers,
  resolveNextHandler,
  type MakeupObligation,
} from '@shared/utils/rotation';
import {RotateCw} from '@theme/icons';

import {useChores, useMakeupObligations, type ChoreWithHandler} from '../services/chores';
import {RotationCarousel, type RotationCarouselCard} from './RotationCarousel';

/** How many cycles beyond "Now" to project per chore (plan section 4.2's carousel preview depth). */
const UPCOMING_CYCLES_COUNT = 3;

interface CycleProjection {
  key: string;
  label: string;
  handlerId: string;
  isMakeup: boolean;
}

function labelForCycle(index: number): string {
  if (index === 0) {
    return 'Now';
  }
  if (index === 1) {
    return 'Next';
  }
  return `In ${index} turns`;
}

/**
 * Projects `chore`'s current + `UPCOMING_CYCLES_COUNT` upcoming handlers by
 * replaying `resolveNextHandler`/`projectUpcomingHandlers` (client-side port
 * of `fn_next_handler`, see shared/utils/rotation.ts). A chore that has never
 * had an assignment (`currentHandlerId === null`) previews from the same
 * "first sorted member" starting point the server would use.
 */
function projectCycles(
  chore: ChoreWithHandler,
  memberIds: string[],
  isDuo: boolean,
  pendingMakeupObligations: MakeupObligation[],
): CycleProjection[] {
  const nowHandlerId =
    chore.currentHandlerId ??
    resolveNextHandler({
      memberIds,
      currentHandlerId: null,
      isDuo,
      choreId: chore.id,
      pendingMakeupObligations,
    });

  const upcoming = projectUpcomingHandlers({
    memberIds,
    currentHandlerId: nowHandlerId,
    isDuo,
    choreId: chore.id,
    pendingMakeupObligations,
    count: UPCOMING_CYCLES_COUNT,
  });

  return [nowHandlerId, ...upcoming].map((handlerId, index) => ({
    key: `${chore.id}-${index}`,
    label: labelForCycle(index),
    handlerId,
    isMakeup: hasMakeupObligationForChore(pendingMakeupObligations, chore.id, handlerId),
  }));
}

/**
 * Rotation tab (plan section 4.2). `useChores` still surfaces real
 * current-handler state (Phase 3, unchanged); this rewrite adds
 * `RotationCarousel`'s client-side preview of upcoming cycles, replaying
 * `fn_next_handler`'s deterministic ordering via `shared/utils/rotation.ts`.
 * The server remains authoritative at assignment-creation time -- this is a
 * preview only (see rotation.ts's file header).
 */
export function RotationScreen(): React.JSX.Element {
  const chores = useChores();
  const members = useMembers();
  const {data: profile} = useHouseholdProfile();
  const makeupObligations = useMakeupObligations();

  const rows = chores.data ?? [];
  const memberIds = useMemo(() => (members.data ?? []).map(member => member.id), [members.data]);
  const namesById = useMemo(
    () => new Map((members.data ?? []).map(member => [member.id, member.full_name])),
    [members.data],
  );

  // The carousel preview needs the full member list + profile to replay
  // `fn_next_handler`; until those resolve, fall back to the plain
  // current-handler row below (still real data, just without the preview).
  const canPreview = memberIds.length > 0 && profile !== undefined && !makeupObligations.isLoading;

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Rotation</Text>

      {rows.length === 0 && !chores.isLoading ? (
        <EmptyState
          icon={<RotateCw size={40} strokeWidth={1.75} color="#0D9488" />}
          title="No chores yet."
          subtitle="Chores set up during onboarding will appear here."
        />
      ) : null}

      {rows.length > 0 && canPreview
        ? rows.map(chore => {
            const cards: RotationCarouselCard[] = projectCycles(
              chore,
              memberIds,
              profile?.kind === 'duo',
              makeupObligations.data ?? [],
            ).map(cycle => ({
              key: cycle.key,
              label: cycle.label,
              isMakeup: cycle.isMakeup,
              handlerName: namesById.get(cycle.handlerId) ?? 'Unknown',
            }));

            return (
              <View key={chore.id}>
                <SectionHeader title={chore.title} />
                <RotationCarousel cards={cards} />
              </View>
            );
          })
        : null}

      {rows.length > 0 && !canPreview ? (
        <Card className="mt-4 gap-1">
          {rows.map((chore, index) => (
            <View key={chore.id} className={index > 0 ? 'border-t border-border pt-1' : ''}>
              <ListRow
                title={chore.title}
                subtitle={
                  chore.currentHandlerName
                    ? `Currently with ${chore.currentHandlerName}`
                    : 'Unassigned'
                }
                leading={<Avatar name={chore.currentHandlerName ?? '?'} size={32} />}
              />
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
