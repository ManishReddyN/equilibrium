// Phase 5 section 5.2, point 3: scheduled nightly via pg_cron
// (supabase/migrations/0008_notifications_cron.sql's 'rotation-tick-nightly'
// job). Pure orchestration -- all the actual rotation logic (which member is
// next, which chores qualify) lives in `fn_rotation_tick`/`fn_next_handler`
// (0004/0008); this function's only job is to invoke that RPC and log the
// result. See fn_rotation_tick's own comment for why this only fires in
// practice for shared_flat/co_living skips.
import {log} from '../_shared/log.ts';
import {aipErrorResponse} from '../_shared/errors.ts';
import {supabaseAdmin} from '../_shared/supabaseAdmin.ts';

Deno.serve(async () => {
  const supabase = supabaseAdmin();
  const {data, error} = await supabase.rpc('fn_rotation_tick');

  if (error) {
    log('error', 'rotation_tick.failed', {error: error.message});
    return aipErrorResponse(500, 'INTERNAL', 'fn_rotation_tick RPC failed.', 'ROTATION_TICK_FAILED');
  }

  log('info', 'rotation_tick.complete', {assignmentsCreated: data});
  return new Response(JSON.stringify({assignmentsCreated: data}), {
    status: 200,
    headers: {'Content-Type': 'application/json'},
  });
});
