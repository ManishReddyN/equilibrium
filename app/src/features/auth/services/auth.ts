/**
 * Email + OTP sign-in, wrapping `supabase.auth` directly (no bespoke backend
 * route -- Supabase Auth issues and verifies the one-time code itself).
 *
 * Plan-gap fill: the execution plan's RootNavigator spec ("AuthGate ->
 * Onboarding | MainTabs") assumes a signed-in user before onboarding ever
 * starts (household creation needs `auth.uid()`), but the plan never
 * specifies *how* that sign-in happens. Anonymous auth was considered and
 * rejected -- roommates need a durable identity that survives reinstalls and
 * works across each roommate's own device, which anonymous sessions don't
 * provide. Magic-link was considered and rejected in favor of a 6-digit OTP
 * code because deep-link handling for magic links is real added complexity
 * (and collides with the `equilibrium://join?code=` invite deep link), while
 * `signInWithOtp` + `verifyOtp` needs no link handling at all: the user types
 * the code Supabase emails them. See docs/DECISIONS.md.
 */
import {supabase} from '@lib/supabase';

/** Sends a 6-digit one-time code to `email`. Creates the auth user on first sign-in. */
export async function requestOtp(email: string): Promise<void> {
  const {error} = await supabase.auth.signInWithOtp({
    email,
    options: {shouldCreateUser: true},
  });
  if (error) {
    throw error;
  }
}

/** Verifies the 6-digit code sent by `requestOtp`, establishing a session on success. */
export async function verifyOtp(email: string, token: string): Promise<void> {
  const {error} = await supabase.auth.verifyOtp({email, token, type: 'email'});
  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const {error} = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
