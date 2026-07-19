import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Button} from '@shared/components/Button';

import type {OnboardingStackParamList} from '@app/navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'CreateOrJoin'>;

export function CreateOrJoinScreen({navigation}: Props): React.JSX.Element {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4 px-4">
        <Text className="font-sans-bold text-2xl text-ink">Create or join?</Text>
        <View className="w-full gap-3">
          <Button label="Create a new household" onPress={() => navigation.navigate('HouseholdBasics')} />
          <Button
            label="Join with an invite code"
            variant="secondary"
            onPress={() => navigation.navigate('JoinHousehold', {})}
          />
        </View>
      </View>
    </Screen>
  );
}
