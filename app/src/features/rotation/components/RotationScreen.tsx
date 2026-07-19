import React from 'react';
import {Text, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {ListRow} from '@shared/components/ListRow';
import {Avatar} from '@shared/components/Avatar';
import {EmptyState} from '@shared/components/EmptyState';
import {RotateCw} from '@theme/icons';

import {useChores} from '../services/chores';

/**
 * Rotation tab -- Phase 3 lists chores with their current handler (real
 * data). Phase 4.2 adds `RotationCarousel` (Reanimated physics carousel over
 * upcoming cycles replayed client-side); the data hook here is unaffected.
 */
export function RotationScreen(): React.JSX.Element {
  const chores = useChores();
  const rows = chores.data ?? [];

  return (
    <Screen scrollable>
      <Text className="pt-4 font-sans-bold text-2xl text-ink">Rotation</Text>

      {rows.length === 0 && !chores.isLoading ? (
        <EmptyState
          icon={<RotateCw size={40} strokeWidth={1.75} color="#0D9488" />}
          title="No chores yet."
          subtitle="Chores set up during onboarding will appear here."
        />
      ) : (
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
      )}
    </Screen>
  );
}
