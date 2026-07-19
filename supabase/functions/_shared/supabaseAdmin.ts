// Every Supabase edge function runtime auto-injects SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_ANON_KEY/SUPABASE_DB_URL) -- no
// manual secret setup needed for this one, unlike the Vault-stored
// project_url/service_role_key that Postgres itself needs to call back
// *into* these functions (see supabase/migrations/0008_notifications_cron.sql).
import {createClient} from 'npm:@supabase/supabase-js@2';

export function supabaseAdmin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}
