// Phase 5 section 5.2, point 1: invoked by the `trg_notification_outbox_dispatch`
// trigger (supabase/migrations/0008_notifications_cron.sql) on every
// notification_outbox row inserted with dispatch_mode = 'immediate'
// (duo/shared_flat households). The trigger POSTs the row itself as the
// body -- no Supabase Database Webhook envelope to unwrap, since this is a
// hand-rolled pg_net trigger rather than a dashboard-configured webhook.
import {z} from 'npm:zod@3';

import {aipErrorResponse} from '../_shared/errors.ts';
import {log} from '../_shared/log.ts';
import {supabaseAdmin} from '../_shared/supabaseAdmin.ts';
import {parseServiceAccount, sendPush, type NotificationChannel} from '../_shared/fcm.ts';

const payloadSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  category: z.string().min(1),
  dispatch_mode: z.literal('immediate'),
});

// Client-side deep-linking (plan section 5.1) maps `category` to a tab
// itself; this only decides which Android/iOS notification channel to show
// under -- 'assignment' notifications are always chore-related regardless
// of who's due, 'market' listings are also chore-adjacent, so both use the
// default-importance 'chores' channel. Nothing in this immediate-dispatch
// path is ever digest-mode, so 'digest' is never selected here.
const NOTIFICATION_CHANNEL: NotificationChannel = 'chores';

Deno.serve(async request => {
  let payload: z.infer<typeof payloadSchema>;
  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    log('warn', 'push_dispatch.invalid_payload', {error: String(error)});
    return aipErrorResponse(400, 'INVALID_ARGUMENT', 'Invalid notification_outbox payload.', 'INVALID_PAYLOAD');
  }

  const fcmServiceAccountRaw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!fcmServiceAccountRaw) {
    log('error', 'push_dispatch.missing_fcm_service_account', {outboxId: payload.id});
    return aipErrorResponse(500, 'INTERNAL', 'FCM_SERVICE_ACCOUNT is not configured.', 'MISSING_SECRET');
  }
  const serviceAccount = parseServiceAccount(fcmServiceAccountRaw);

  const supabase = supabaseAdmin();
  const {data: profile, error: profileError} = await supabase
    .from('profiles')
    .select('push_token_ios, push_token_android')
    .eq('id', payload.recipient_id)
    .maybeSingle();

  if (profileError) {
    log('error', 'push_dispatch.profile_lookup_failed', {outboxId: payload.id, error: profileError.message});
    return aipErrorResponse(500, 'INTERNAL', 'Failed to look up recipient push tokens.', 'PROFILE_LOOKUP_FAILED');
  }

  const tokens = [profile?.push_token_ios, profile?.push_token_android].filter(
    (token): token is string => Boolean(token),
  );

  if (tokens.length === 0) {
    log('info', 'push_dispatch.no_tokens', {outboxId: payload.id, recipientId: payload.recipient_id});
  } else {
    const results = await Promise.allSettled(
      tokens.map(token =>
        sendPush(serviceAccount, {
          token,
          title: payload.title,
          body: payload.body,
          channel: NOTIFICATION_CHANNEL,
          data: {category: payload.category, outboxId: payload.id},
        }),
      ),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        log('error', 'push_dispatch.send_failed', {
          outboxId: payload.id,
          tokenIndex: index,
          error: String(result.reason),
        });
      }
    });
  }

  // Best-effort semantics: stamped once dispatch was attempted, not
  // conditioned on every token actually succeeding (there's no retry queue
  // for immediate mode -- that's what distinguishes it from digest mode).
  const {error: stampError} = await supabase
    .from('notification_outbox')
    .update({dispatched_at: new Date().toISOString()})
    .eq('id', payload.id);
  if (stampError) {
    log('error', 'push_dispatch.stamp_failed', {outboxId: payload.id, error: stampError.message});
  }

  return new Response(JSON.stringify({dispatched: tokens.length}), {
    status: 200,
    headers: {'Content-Type': 'application/json'},
  });
});
