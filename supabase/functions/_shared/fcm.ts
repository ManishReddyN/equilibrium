// FCM HTTP v1 API sender (plan section 5.2, point 1). v1 requires an OAuth2
// access token minted from the service account's own key (the legacy
// server-key API this replaces did not), so this signs a short-lived JWT
// assertion and exchanges it at Google's token endpoint -- the standard
// service-account "JWT bearer" flow. iOS delivery also goes through FCM
// (which relays to APNs); see docs/DECISIONS.md for why that satisfies the
// plan's "direct APNs" line without a separate raw-APNs module for now.
import {SignJWT, importPKCS8} from 'npm:jose@5';

export interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export function parseServiceAccount(base64Json: string): FcmServiceAccount {
  const json = JSON.parse(atob(base64Json));
  return {
    project_id: json.project_id,
    client_email: json.client_email,
    private_key: json.private_key,
  };
}

const TOKEN_SAFETY_MARGIN_SECONDS = 60;
let cachedToken: {accessToken: string; expiresAt: number} | null = null;

async function getAccessToken(serviceAccount: FcmServiceAccount): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > nowSeconds + TOKEN_SAFETY_MARGIN_SECONDS) {
    return cachedToken.accessToken;
  }

  const key = await importPKCS8(serviceAccount.private_key, 'RS256');
  const assertion = await new SignJWT({scope: 'https://www.googleapis.com/auth/firebase.messaging'})
    .setProtectedHeader({alg: 'RS256'})
    .setIssuer(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + 3600)
    .sign(key);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`FCM OAuth token exchange failed: ${response.status} ${await response.text()}`);
  }
  const json = await response.json();
  cachedToken = {accessToken: json.access_token, expiresAt: nowSeconds + json.expires_in};
  return cachedToken.accessToken;
}

export type NotificationChannel = 'chores' | 'digest';

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  data?: Record<string, string>;
}

// Two Android channels (`chores` default importance, `digest` low importance)
// per plan section 5.1; iOS categories of the same names mirror them.
export async function sendPush(serviceAccount: FcmServiceAccount, message: PushMessage): Promise<void> {
  const accessToken = await getAccessToken(serviceAccount);
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`},
      body: JSON.stringify({
        message: {
          token: message.token,
          notification: {title: message.title, body: message.body},
          data: message.data ?? {},
          android: {notification: {channel_id: message.channel}},
          apns: {payload: {aps: {category: message.channel}}},
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`FCM send failed: ${response.status} ${await response.text()}`);
  }
}
