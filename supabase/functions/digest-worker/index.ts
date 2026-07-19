// Phase 5 section 5.2, point 2: scheduled hourly via pg_cron
// (supabase/migrations/0008_notifications_cron.sql's 'digest-worker-hourly'
// job). Selects co_living households whose digest_hour_local matches the
// current hour in households.timezone, aggregates each recipient's
// undispatched dispatch_mode = 'digest' outbox rows into one push, and
// stamps dispatched_at so a later hourly run never re-sends the same rows
// (idempotent even if pg_cron double-fires or this function is re-invoked
// manually).
//
// The plan's own illustrative summary text ("4 chores completed, 2 due
// tomorrow, 1 market listing") doesn't match what notification_outbox
// actually contains: the only two triggers that ever insert a row
// (fn_notify_new_assignment, fn_notify_new_listing in 0004) produce
// category = 'assignment' (a new chore was just assigned to you) or
// 'market' (a new listing opened) -- there is no trigger anywhere for
// "completed" or "due tomorrow" events. Rather than inventing new triggers
// this phase never asked for, the digest summarizes what's actually queued:
// new-assignment and new-listing counts. See docs/DECISIONS.md.
import {log} from '../_shared/log.ts';
import {supabaseAdmin} from '../_shared/supabaseAdmin.ts';
import {parseServiceAccount, sendPush} from '../_shared/fcm.ts';

interface OutboxRow {
  id: string;
  recipient_id: string;
  category: string;
}

function currentHourInTimezone(timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone: timezone, hour: 'numeric', hour12: false}).formatToParts(
    new Date(),
  );
  const hourPart = parts.find(part => part.type === 'hour')?.value ?? '0';
  // Intl's 24h format uses "24" for midnight in some locales/environments instead of "0".
  return Number(hourPart) % 24;
}

function summarize(rows: OutboxRow[]): string {
  const assignmentCount = rows.filter(row => row.category === 'assignment').length;
  const marketCount = rows.filter(row => row.category === 'market').length;
  const otherCount = rows.length - assignmentCount - marketCount;

  const parts: string[] = [];
  if (assignmentCount > 0) {
    parts.push(`${assignmentCount} new chore${assignmentCount === 1 ? '' : 's'}`);
  }
  if (marketCount > 0) {
    parts.push(`${marketCount} new market listing${marketCount === 1 ? '' : 's'}`);
  }
  if (otherCount > 0) {
    parts.push(`${otherCount} other update${otherCount === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}

Deno.serve(async () => {
  const fcmServiceAccountRaw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!fcmServiceAccountRaw) {
    log('error', 'digest_worker.missing_fcm_service_account', {});
    return new Response(JSON.stringify({error: 'FCM_SERVICE_ACCOUNT is not configured.'}), {status: 500});
  }
  const serviceAccount = parseServiceAccount(fcmServiceAccountRaw);
  const supabase = supabaseAdmin();

  const {data: households, error: householdsError} = await supabase
    .from('households')
    .select('id, digest_hour_local, timezone')
    .eq('profile', 'co_living');
  if (householdsError) {
    log('error', 'digest_worker.households_query_failed', {error: householdsError.message});
    return new Response(JSON.stringify({error: 'Failed to query co_living households.'}), {status: 500});
  }

  const dueHouseholdIds = (households ?? [])
    .filter(household => currentHourInTimezone(household.timezone) === household.digest_hour_local)
    .map(household => household.id);

  if (dueHouseholdIds.length === 0) {
    log('info', 'digest_worker.no_households_due', {});
    return new Response(JSON.stringify({dispatched: 0}), {status: 200});
  }

  const {data: outboxRows, error: outboxError} = await supabase
    .from('notification_outbox')
    .select('id, recipient_id, category')
    .in('household_id', dueHouseholdIds)
    .eq('dispatch_mode', 'digest')
    .is('dispatched_at', null);
  if (outboxError) {
    log('error', 'digest_worker.outbox_query_failed', {error: outboxError.message});
    return new Response(JSON.stringify({error: 'Failed to query notification_outbox.'}), {status: 500});
  }

  const rowsByRecipient = new Map<string, OutboxRow[]>();
  for (const row of outboxRows ?? []) {
    const existing = rowsByRecipient.get(row.recipient_id) ?? [];
    existing.push(row);
    rowsByRecipient.set(row.recipient_id, existing);
  }

  let dispatchedRecipients = 0;
  for (const [recipientId, rows] of rowsByRecipient) {
    const {data: profile, error: profileError} = await supabase
      .from('profiles')
      .select('push_token_ios, push_token_android')
      .eq('id', recipientId)
      .maybeSingle();

    if (profileError) {
      log('error', 'digest_worker.profile_lookup_failed', {recipientId, error: profileError.message});
      continue;
    }

    const tokens = [profile?.push_token_ios, profile?.push_token_android].filter(
      (token): token is string => Boolean(token),
    );
    const summary = summarize(rows);

    if (tokens.length === 0) {
      log('info', 'digest_worker.no_tokens', {recipientId, rowCount: rows.length});
    } else {
      const results = await Promise.allSettled(
        tokens.map(token =>
          sendPush(serviceAccount, {
            token,
            title: 'Your household digest',
            body: summary,
            channel: 'digest',
            data: {category: 'digest'},
          }),
        ),
      );
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          log('error', 'digest_worker.send_failed', {recipientId, tokenIndex: index, error: String(result.reason)});
        } else {
          dispatchedRecipients += 1;
        }
      });
    }

    const {error: stampError} = await supabase
      .from('notification_outbox')
      .update({dispatched_at: new Date().toISOString()})
      .in(
        'id',
        rows.map(row => row.id),
      );
    if (stampError) {
      log('error', 'digest_worker.stamp_failed', {recipientId, error: stampError.message});
    }
  }

  log('info', 'digest_worker.complete', {
    householdsDue: dueHouseholdIds.length,
    recipientsProcessed: rowsByRecipient.size,
    dispatchedRecipients,
  });
  return new Response(JSON.stringify({dispatched: dispatchedRecipients}), {
    status: 200,
    headers: {'Content-Type': 'application/json'},
  });
});
