/**
 * Supabase client, typed with the (currently hand-authored -- see
 * database.types.ts's header comment) Database type. Two polyfills are
 * imported for side effects only, and order matters: get-random-values must
 * land before anything that calls crypto.getRandomValues (supabase-js's PKCE
 * flow), and both must load before `createClient` is invoked below.
 */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import {createClient, type SupportedStorage} from '@supabase/supabase-js';
import {MMKV} from 'react-native-mmkv';

import {env} from './env';
import type {Database} from './database.types';

// Isolated MMKV instance (separate id from any feature-level storage) so
// clearing app data for one purpose can never accidentally wipe the auth
// session, and vice versa.
const authStorage = new MMKV({id: 'equilibrium-auth'});

const mmkvStorageAdapter: SupportedStorage = {
  getItem: key => authStorage.getString(key) ?? null,
  setItem: (key, value) => {
    authStorage.set(key, value);
  },
  removeItem: key => {
    authStorage.delete(key);
  },
};

export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    storage: mmkvStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // No browser/window on React Native -- there is never a session token in a URL to detect.
    detectSessionInUrl: false,
  },
});
