/**
 * Email + password sign-in/sign-up, wrapping `supabase.auth` directly.
 *
 * Supersedes the OTP-based flow this file used until 2026-07-19 (see
 * docs/DECISIONS.md for that original rationale, and the same file for why
 * it was replaced): explicit user direction to start with the simplest
 * possible auth -- plain email + password -- and layer email verification
 * on top later, rather than an OTP round-trip on every sign-in.
 *
 * `enable_confirmations` is currently `false` in supabase/config.toml (local
 * dev), so `signUp` establishes a session immediately on this project as
 * configured today; `signUpWithPassword`'s `hasSession` return value lets the
 * UI handle either case correctly regardless, since the *live* project's
 * actual confirmation setting hasn't been verified (docs/RUNBOOK.md) and
 * flipping it on later (the "add email verification later" half of this
 * change) needs no client-side change at all as a result.
 */
import {supabase} from '@lib/supabase';

export interface SignUpResult {
  /** False if email confirmation is required before a session exists -- a project-level Supabase Auth setting, not something this client controls. */
  hasSession: boolean;
}

/** Creates the auth user (and, via `fn_handle_new_user`, its `profiles` row) and signs in. */
export async function signUpWithPassword(email: string, password: string, fullName: string): Promise<SignUpResult> {
  const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options: {data: {full_name: fullName}},
  });
  if (error) {
    throw error;
  }
  return {hasSession: data.session !== null};
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const {error} = await supabase.auth.signInWithPassword({email, password});
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
