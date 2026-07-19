/**
 * Typed navigation (plan section 3.1). `RootStackParamList` branches on
 * `RootNavigator`'s AuthGate: `Loading` while session/household are
 * resolving, `Auth` when signed out, `Onboarding` when signed in but not yet
 * in a household, `Main` otherwise. `Loading` isn't in the plan's literal
 * spec but is a deliberate small addition -- without it the gate flashes
 * `Onboarding` for a frame while `useHousehold()` is still loading after a
 * fresh sign-in. See docs/DECISIONS.md.
 */
import type {NavigatorScreenParams} from '@react-navigation/native';

export type OnboardingStackParamList = {
  Welcome: undefined;
  CreateOrJoin: undefined;
  HouseholdBasics: undefined;
  ChoreSetup: {householdId: string};
  DefinitionOfDone: {householdId: string};
  InviteShare: undefined;
  // `code` matches the deep link's query param name 1:1 (equilibrium://join?code=...)
  // so linking.ts needs no custom `parse` to rename it.
  JoinHousehold: {code?: string};
};

/**
 * Bottom tabs. Market/Feedback are conditionally rendered by `MainTabs.tsx`
 * (profile-gated) but still need param-list entries so `navigation.navigate`
 * to them type-checks from screens that render conditionally too.
 */
export type MainTabParamList = {
  Home: undefined;
  Rotation: undefined;
  Ledger: undefined;
  Market: undefined;
  Feedback: undefined;
  Household: undefined;
};

export type RootStackParamList = {
  Loading: undefined;
  Auth: undefined;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList> | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- standard React Navigation typed-navigation pattern (https://reactnavigation.org/docs/typescript/)
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
