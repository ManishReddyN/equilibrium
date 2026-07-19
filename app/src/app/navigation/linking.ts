/**
 * Deep linking (plan section 3.1/4.4): `equilibrium://join?code=...` routes
 * straight to the manual-code entry screen with the code pre-filled. Query
 * strings attach to route params under their own key by default, so naming
 * the route param `code` (not `inviteCode`) avoids needing a custom `parse`.
 *
 * Known limitation: this only resolves while `RootNavigator` currently has
 * the Onboarding stack mounted (signed in, no household yet) -- React
 * Navigation can't route to a screen that isn't part of the currently
 * rendered navigator tree. Opening the link signed-out, or already in a
 * household, silently does nothing.
 *
 * Notification-tap deep links (plan section 5.1) hit the exact same
 * "pending route" gap -- see `features/notifications/services/notificationLinking.ts`,
 * which accepts it rather than building a general queued-navigation
 * mechanism for either case in this phase.
 */
import type {LinkingOptions} from '@react-navigation/native';

import type {RootStackParamList} from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['equilibrium://'],
  config: {
    screens: {
      Onboarding: {
        screens: {
          JoinHousehold: 'join',
        },
      },
    },
  },
};
