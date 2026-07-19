import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import type {OnboardingStackParamList} from '@app/navigation/types';

import {WelcomeScreen} from './WelcomeScreen';
import {CreateOrJoinScreen} from './CreateOrJoinScreen';
import {HouseholdBasicsScreen} from './HouseholdBasicsScreen';
import {ChoreSetupScreen} from './ChoreSetupScreen';
import {DefinitionOfDoneScreen} from './DefinitionOfDoneScreen';
import {InviteShareScreen} from './InviteShareScreen';
import {JoinHouseholdScreen} from './JoinHouseholdScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Native stack sub-flow (plan section 4.4): Welcome -> CreateOrJoin ->
 * (create) HouseholdBasics -> ChoreSetup -> DefinitionOfDone -> InviteShare;
 * (join) JoinHousehold. Not listed as its own file in the plan's `app/navigation/`
 * tree (only RootNavigator.tsx and MainTabs.tsx are) so it lives alongside its
 * own feature's screens instead, consistent with "cross-feature needs go
 * through shared/ or lib/" -- `RootNavigator` importing this is app-importing-
 * feature, not feature-importing-feature.
 */
export function OnboardingNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="CreateOrJoin" component={CreateOrJoinScreen} />
      <Stack.Screen name="HouseholdBasics" component={HouseholdBasicsScreen} />
      <Stack.Screen name="ChoreSetup" component={ChoreSetupScreen} />
      <Stack.Screen name="DefinitionOfDone" component={DefinitionOfDoneScreen} />
      <Stack.Screen name="InviteShare" component={InviteShareScreen} />
      <Stack.Screen name="JoinHousehold" component={JoinHouseholdScreen} />
    </Stack.Navigator>
  );
}
