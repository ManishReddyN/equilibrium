/**
 * Notification-tap deep-linking (plan section 5.1): the FCM `data` payload
 * carries `{category, outboxId}` (see supabase/functions/push-dispatch and
 * digest-worker) rather than the plan's literal `{"route":"assignment","id":"..."}`
 * shape, because this app has no per-item detail screen to route an id
 * into -- assignments render inline on the Dashboard, listings inline on
 * Market (see MarketScreen.tsx/ListingComposerSheet.tsx from Phase 4).
 * `category` maps to the tab that already shows that content:
 * 'market' -> Market tab, everything else ('assignment', 'digest') -> Home.
 * See docs/DECISIONS.md.
 *
 * Same known limitation `navigation/linking.ts` already documents for the
 * join-by-code deep link: this can only navigate while `Main` is the
 * currently rendered stack screen (signed in, has a household). A
 * cold-start tap while signed out or mid-onboarding is a silent no-op
 * rather than a queued "pending route" -- accepted for this phase rather
 * than building that general mechanism for either deep-link case.
 */
import messaging, {type FirebaseMessagingTypes} from '@react-native-firebase/messaging';

import {navigationRef} from '@app/navigation/navigationRef';

function tabForCategory(category: string | undefined): 'Home' | 'Market' {
  return category === 'market' ? 'Market' : 'Home';
}

function navigateToNotification(message: FirebaseMessagingTypes.RemoteMessage): void {
  if (!navigationRef.isReady()) {
    return;
  }
  const category = typeof message.data?.category === 'string' ? message.data.category : undefined;
  navigationRef.navigate('Main', {screen: tabForCategory(category)});
}

/** Cold start: the app was killed and opened by tapping a notification. */
export async function handleInitialNotification(): Promise<void> {
  const message = await messaging().getInitialNotification();
  if (message) {
    navigateToNotification(message);
  }
}

/** Backgrounded (not killed) app brought to the foreground by tapping a notification. */
export function subscribeToNotificationOpen(): () => void {
  return messaging().onNotificationOpenedApp(navigateToNotification);
}
