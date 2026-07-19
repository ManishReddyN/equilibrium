import React from 'react';

import {useHouseholdProfile, type HouseholdProfile} from '@shared/hooks/useHouseholdProfile';

interface ProfileGateProps {
  allow: Array<HouseholdProfile['kind']>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * `<ProfileGate allow={['shared_flat']}>...</ProfileGate>` -- UX-layer feature
 * visibility switch (Market tab hidden outside shared_flat, Feedback composer
 * only in duo, cohort chips only in co_living). Presentation-only: the server
 * (Phase 2 RLS + triggers) remains the real enforcement layer regardless of
 * what this renders.
 */
export function ProfileGate({allow, children, fallback = null}: ProfileGateProps): React.JSX.Element {
  const {data: profile} = useHouseholdProfile();
  if (!profile || !allow.includes(profile.kind)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
