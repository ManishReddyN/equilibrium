import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Button} from '@shared/components/Button';

import type {OnboardingStackParamList} from '@app/navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export function WelcomeScreen({navigation}: Props): React.JSX.Element {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6 px-4">
        <View className="items-center gap-2">
          <Text className="font-sans-bold text-3xl text-ink">Welcome to Equilibrium</Text>
          <Text className="text-center font-sans text-base text-ink-muted">
            A fair, deterministic chore rotation for your household -- no guesswork, no
            arguments about whose turn it is.
          </Text>
        </View>
        <Button label="Get started" onPress={() => navigation.navigate('CreateOrJoin')} />
      </View>
    </Screen>
  );
}
