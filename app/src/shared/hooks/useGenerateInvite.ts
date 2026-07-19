import {useMutation} from '@tanstack/react-query';

import {supabase} from '@lib/supabase';

export interface GeneratedInvite {
  code: string;
  deepLink: string;
}

/**
 * Wraps `fn_generate_invite` (RLS-scoped to current members). Shared between
 * `features/onboarding` (first invite, end of the create flow) and
 * `features/household` (steady-state "invite another roommate" action) --
 * lives in `shared/` rather than either feature per the plan's "features
 * never import from other features; cross-feature needs go through shared/
 * or lib/" rule (plan section 3.1).
 */
export function useGenerateInvite(): ReturnType<typeof useMutation<GeneratedInvite, Error, void>> {
  return useMutation({
    mutationFn: async (): Promise<GeneratedInvite> => {
      const {data, error} = await supabase.rpc('fn_generate_invite');
      if (error) {
        throw error;
      }
      return {code: data, deepLink: `equilibrium://join?code=${encodeURIComponent(data)}`};
    },
  });
}
