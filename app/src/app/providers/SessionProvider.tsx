/**
 * Supabase auth state -> React context (plan section 3.1). Single source of
 * truth for "who is signed in right now" -- RootNavigator's AuthGate,
 * useHouseholdProfile, and any push-token upsert all read `useSession()`
 * instead of independently calling `supabase.auth.getSession()`.
 */
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import type {Session} from '@supabase/supabase-js';

import {supabase} from '@lib/supabase';

interface SessionContextValue {
  session: Session | null;
  /** True until the initial `getSession()` call resolves. */
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({children}: {children: React.ReactNode}): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(
      ({data}) => {
        if (isMounted) {
          setSession(data.session);
          setIsLoading(false);
        }
      },
      () => {
        // Network failure on the initial session check -- treat as signed
        // out rather than leaving the app stuck on the Loading screen
        // forever; onAuthStateChange below will correct this the moment
        // connectivity returns and a real auth event fires.
        if (isMounted) {
          setIsLoading(false);
        }
      },
    );

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(() => ({session, isLoading}), [session, isLoading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
