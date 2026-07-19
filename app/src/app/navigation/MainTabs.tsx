import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {DashboardScreen} from '@features/dashboard/components/DashboardScreen';
import {RotationScreen} from '@features/rotation/components/RotationScreen';
import {LedgerScreen} from '@features/ledger/components/LedgerScreen';
import {MarketScreen} from '@features/market/components/MarketScreen';
import {FeedbackScreen} from '@features/feedback/components/FeedbackScreen';
import {HouseholdScreen} from '@features/household/components/HouseholdScreen';
import {useHouseholdProfile} from '@shared/hooks/useHouseholdProfile';
import {Home, RotateCw, Scale, Users, ArrowLeftRight, Clock} from '@theme/icons';
import {colors} from '@theme/tokens';

import type {MainTabParamList} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  color: string;
  size: number;
}

// One stable, module-level component per tab icon (rather than an inline
// arrow function in each `tabBarIcon` option) so React Navigation sees the
// same component identity across renders -- an inline
// `tabBarIcon: ({color, size}) => <Home .../>` creates a brand new component
// type on every MainTabs render, which react/no-unstable-nested-components
// flags because React would then remount the icon subtree every time.
function HomeTabIcon({color, size}: TabIconProps): React.JSX.Element {
  return <Home color={color} size={size} strokeWidth={1.75} />;
}
function RotationTabIcon({color, size}: TabIconProps): React.JSX.Element {
  return <RotateCw color={color} size={size} strokeWidth={1.75} />;
}
function LedgerTabIcon({color, size}: TabIconProps): React.JSX.Element {
  return <Scale color={color} size={size} strokeWidth={1.75} />;
}
function MarketTabIcon({color, size}: TabIconProps): React.JSX.Element {
  return <ArrowLeftRight color={color} size={size} strokeWidth={1.75} />;
}
function FeedbackTabIcon({color, size}: TabIconProps): React.JSX.Element {
  return <Clock color={color} size={size} strokeWidth={1.75} />;
}
function HouseholdTabIcon({color, size}: TabIconProps): React.JSX.Element {
  return <Users color={color} size={size} strokeWidth={1.75} />;
}

/**
 * Bottom tabs: Home, Rotation, Ledger, Household are always present (plan
 * section 3.1's literal list). Market and Feedback are additional tabs
 * rendered only for the relevant household profile -- reading section 3.4's
 * "Market tab hidden outside shared_flat" and "Feedback composer only in
 * duo" as both being conditional tabs, since 4.5 calls them "secondary
 * features" and the folder tree comment only calls out the four
 * always-present ones. See docs/DECISIONS.md.
 */
export function MainTabs(): React.JSX.Element {
  const {data: profile} = useHouseholdProfile();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
      }}>
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{tabBarIcon: HomeTabIcon}}
      />
      <Tab.Screen
        name="Rotation"
        component={RotationScreen}
        options={{tabBarIcon: RotationTabIcon}}
      />
      <Tab.Screen
        name="Ledger"
        component={LedgerScreen}
        options={{tabBarIcon: LedgerTabIcon}}
      />
      {profile?.kind === 'shared_flat' ? (
        <Tab.Screen
          name="Market"
          component={MarketScreen}
          options={{tabBarIcon: MarketTabIcon}}
        />
      ) : null}
      {profile?.kind === 'duo' ? (
        <Tab.Screen
          name="Feedback"
          component={FeedbackScreen}
          options={{tabBarIcon: FeedbackTabIcon}}
        />
      ) : null}
      <Tab.Screen
        name="Household"
        component={HouseholdScreen}
        options={{tabBarIcon: HouseholdTabIcon}}
      />
    </Tab.Navigator>
  );
}
