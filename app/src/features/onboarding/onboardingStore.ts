/**
 * "Step state in a zustand store, wiped on completion" (plan section 4.4).
 *
 * This store exists for a reason beyond step bookkeeping: `RootNavigator`'s
 * AuthGate decides Onboarding vs Main by whether `useHousehold()` has a row.
 * But the create path calls `fn_create_household` in the *first* onboarding
 * screen (HouseholdBasics) -- the household row exists long before ChoreSetup
 * / DefinitionOfDone / InviteShare run. Without this flag, the gate would rip
 * the user into `Main` the instant the household is created, skipping the
 * rest of onboarding. `isInProgress` overrides the gate until InviteShare
 * explicitly calls `finish()`. Persisted (MMKV) so a force-quit mid-onboarding
 * doesn't drop the override on relaunch -- known gap: a crash between
 * `begin()` and `finish()` that also clears MMKV (e.g. reinstall) would let
 * the gate fall through to Main with a partially-set-up household; accepted
 * for v1 and documented in docs/DECISIONS.md. The join path never calls
 * `begin()` since `fn_join_household` is the flow's only step.
 */
import {create} from 'zustand';
import {persist, createJSONStorage, type StateStorage} from 'zustand/middleware';
import {MMKV} from 'react-native-mmkv';

const onboardingStorage = new MMKV({id: 'equilibrium-onboarding'});

const mmkvStateStorage: StateStorage = {
  getItem: (name: string): string | null => onboardingStorage.getString(name) ?? null,
  setItem: (name: string, value: string): void => onboardingStorage.set(name, value),
  removeItem: (name: string): void => onboardingStorage.delete(name),
};

interface OnboardingState {
  isInProgress: boolean;
  begin: () => void;
  finish: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    set => ({
      isInProgress: false,
      begin: () => set({isInProgress: true}),
      finish: () => set({isInProgress: false}),
    }),
    {
      name: 'onboarding-flow',
      storage: createJSONStorage(() => mmkvStateStorage),
    },
  ),
);
