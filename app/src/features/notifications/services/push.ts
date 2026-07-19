/**
 * Push notification client (plan section 5.1). `PushNotificationManager` is
 * started/stopped from `RootNavigator` exactly like `RealtimeChannelManager`
 * -- one instance per signed-in session, tied to `useSession()`'s user id
 * rather than the household id (a push token belongs to the device/account,
 * not the household).
 *
 * iOS note on "on iOS also read APNs token": `messaging().getToken()` only
 * produces a valid FCM token once Firebase's iOS SDK has completed native
 * APNs registration internally -- `getAPNSToken()` here is a readiness gate
 * for that, not a second token that gets stored anywhere. `profiles` has a
 * single `push_token_ios` column and FCM's v1 `messages:send` API's `token`
 * field expects an FCM registration token on both platforms uniformly (see
 * supabase/functions/_shared/fcm.ts), so the raw APNs token itself is never
 * persisted. See docs/DECISIONS.md.
 */
import {Platform, PermissionsAndroid} from 'react-native';
import messaging, {type FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import notifee, {AndroidImportance} from '@notifee/react-native';

import {supabase} from '@lib/supabase';

export type NotificationChannelId = 'chores' | 'digest';

const ANDROID_CHANNEL_IMPORTANCE: Record<NotificationChannelId, AndroidImportance> = {
  chores: AndroidImportance.DEFAULT,
  digest: AndroidImportance.LOW,
};
const ANDROID_CHANNEL_NAME: Record<NotificationChannelId, string> = {
  chores: 'Chores',
  digest: 'Daily digest',
};

const ANDROID_13 = 33;

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  const channelIds: NotificationChannelId[] = ['chores', 'digest'];
  await Promise.all(
    channelIds.map(id =>
      notifee.createChannel({id, name: ANDROID_CHANNEL_NAME[id], importance: ANDROID_CHANNEL_IMPORTANCE[id]}),
    ),
  );
}

async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= ANDROID_13) {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (permission) {
      const result = await PermissionsAndroid.request(permission);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'ios') {
    await messaging().getAPNSToken();
  }
  const fcmToken = await messaging().getToken();
  const update = Platform.OS === 'ios' ? {push_token_ios: fcmToken} : {push_token_android: fcmToken};

  const {error} = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) {
    throw error;
  }
}

function channelForMessage(message: FirebaseMessagingTypes.RemoteMessage): NotificationChannelId {
  return message.data?.category === 'digest' ? 'digest' : 'chores';
}

/**
 * Firebase Messaging only auto-displays a system notification when the app
 * is backgrounded/killed; in the foreground it just delivers the message to
 * JS silently, so this replicates the same notification via Notifee (iOS
 * "categories mirror" the two Android channels via the same channel id used
 * as the APNs category, per plan section 5.1).
 */
async function displayForegroundNotification(message: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
  if (!message.notification) {
    return;
  }
  const channel = channelForMessage(message);
  await notifee.displayNotification({
    title: message.notification.title,
    body: message.notification.body,
    data: message.data ?? {},
    android: {channelId: channel, importance: ANDROID_CHANNEL_IMPORTANCE[channel]},
    ios: {categoryId: channel},
  });
}

export class PushNotificationManager {
  private unsubscribeTokenRefresh: (() => void) | null = null;
  private unsubscribeForegroundMessage: (() => void) | null = null;

  /** Idempotent: calling `start` again first stops any previous subscriptions. */
  async start(userId: string): Promise<void> {
    this.stop();

    await ensureAndroidChannels();
    const granted = await requestPushPermission();
    if (!granted) {
      return;
    }

    await registerPushToken(userId);
    this.unsubscribeTokenRefresh = messaging().onTokenRefresh(() => {
      void registerPushToken(userId);
    });
    this.unsubscribeForegroundMessage = messaging().onMessage(async message => {
      await displayForegroundNotification(message);
    });
  }

  /** Unsubscribes, e.g. on sign-out or session teardown. Safe to call when already stopped. */
  stop(): void {
    this.unsubscribeTokenRefresh?.();
    this.unsubscribeTokenRefresh = null;
    this.unsubscribeForegroundMessage?.();
    this.unsubscribeForegroundMessage = null;
  }
}
