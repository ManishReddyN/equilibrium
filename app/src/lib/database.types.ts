/**
 * Hand-authored to match `supabase gen types typescript --local` output shape,
 * generated from supabase/migrations/0000-0006. `supabase gen types` itself
 * could not run when this was written (Docker couldn't pull
 * public.ecr.aws/supabase/postgres-meta over an unstable connection) -- see
 * docs/DECISIONS.md. Regenerate for real once that succeeds; diff against this
 * file and reconcile by hand (CI's Prisma drift check covers prisma/schema.prisma,
 * not this file, so nothing else catches drift here automatically yet).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | {[key: string]: Json | undefined}
  | Json[];

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          roommate_count: number;
          profile: Database['public']['Enums']['household_profile'];
          cool_off_minutes: number;
          equilibrium_tolerance: number;
          invite_code_hash: string | null;
          invite_expires_at: string | null;
          digest_hour_local: number;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          roommate_count: number;
          // profile is `generated always as (...) stored` -- never insertable/updatable.
          cool_off_minutes?: number;
          equilibrium_tolerance?: number;
          invite_code_hash?: string | null;
          invite_expires_at?: string | null;
          digest_hour_local?: number;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['households']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          household_id: string | null;
          full_name: string;
          avatar_path: string | null;
          push_token_ios: string | null;
          push_token_android: string | null;
          cohort_index: number | null;
          points_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          household_id?: string | null;
          full_name: string;
          avatar_path?: string | null;
          push_token_ios?: string | null;
          push_token_android?: string | null;
          cohort_index?: number | null;
          points_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'profiles_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      chores: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          definition_of_done: string;
          baseline_photo_path: string | null;
          complexity_weight: number;
          is_recurring: boolean;
          recurrence_days: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          definition_of_done?: string;
          baseline_photo_path?: string | null;
          complexity_weight?: number;
          is_recurring?: boolean;
          recurrence_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chores']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'chores_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          chore_id: string;
          household_id: string;
          current_handler_id: string;
          status: Database['public']['Enums']['assignment_status'];
          rotation_cycle: number;
          is_debit_makeup: boolean;
          target_completion_date: string;
          completed_at: string | null;
          proof_photo_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chore_id: string;
          household_id: string;
          current_handler_id: string;
          status?: Database['public']['Enums']['assignment_status'];
          rotation_cycle?: number;
          is_debit_makeup?: boolean;
          target_completion_date: string;
          completed_at?: string | null;
          proof_photo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['assignments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'assignments_chore_id_fkey';
            columns: ['chore_id'];
            isOneToOne: false;
            referencedRelation: 'chores';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_current_handler_id_fkey';
            columns: ['current_handler_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_ledger: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          assignment_id: string | null;
          points_delta: number;
          entry_type: Database['public']['Enums']['ledger_entry_type'];
          metadata: Json;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          assignment_id?: string | null;
          points_delta: number;
          entry_type: Database['public']['Enums']['ledger_entry_type'];
          metadata?: Json;
          verified_at?: string | null;
          created_at?: string;
        };
        // Append-only in practice (trigger-enforced; UPDATE/DELETE revoked from
        // authenticated/anon) -- Update type kept for shape-completeness only.
        Update: Partial<Database['public']['Tables']['audit_ledger']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'audit_ledger_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_ledger_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'assignments';
            referencedColumns: ['id'];
          },
        ];
      };
      feedback_queue: {
        Row: {
          id: string;
          household_id: string;
          author_id: string;
          recipient_id: string;
          body: string;
          status: Database['public']['Enums']['feedback_status'];
          release_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          author_id: string;
          recipient_id: string;
          body: string;
          status?: Database['public']['Enums']['feedback_status'];
          // set unconditionally by trg_feedback_set_release (before insert); safe to omit.
          release_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['feedback_queue']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'feedback_queue_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_queue_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_queue_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      market_listings: {
        Row: {
          id: string;
          household_id: string;
          assignment_id: string;
          lister_id: string;
          listing_type: string;
          bounty_points: number;
          is_anonymous: boolean;
          claimed_by: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          assignment_id: string;
          lister_id: string;
          listing_type: string;
          bounty_points?: number;
          is_anonymous?: boolean;
          claimed_by?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['market_listings']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'market_listings_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_listings_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_listings_lister_id_fkey';
            columns: ['lister_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_listings_claimed_by_fkey';
            columns: ['claimed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_outbox: {
        Row: {
          id: string;
          household_id: string;
          recipient_id: string;
          title: string;
          body: string;
          category: string;
          dispatch_mode: string;
          dispatched_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          recipient_id: string;
          title: string;
          body: string;
          category: string;
          dispatch_mode: string;
          dispatched_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_outbox']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'notification_outbox_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_outbox_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      market_listings_public: {
        Row: {
          id: string;
          household_id: string;
          assignment_id: string;
          // nulled by the view whenever the base row has is_anonymous = true.
          lister_id: string | null;
          listing_type: string;
          bounty_points: number;
          is_anonymous: boolean;
          claimed_by: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: 'market_listings_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_listings_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'assignments';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      fn_claim_listing: {
        Args: {p_listing_id: string};
        Returns: undefined;
      };
      fn_complete_assignment: {
        Args: {p_assignment_id: string; p_proof_path: string};
        Returns: undefined;
      };
      fn_create_household: {
        Args: {p_name: string; p_roommate_count: number};
        Returns: string;
      };
      fn_generate_invite: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      fn_household_equilibrium: {
        Args: {p_household_id: string};
        Returns: {
          user_id: string;
          share: number;
        }[];
      };
      fn_join_household: {
        Args: {p_invite_secret: string};
        Returns: string;
      };
      fn_next_handler: {
        Args: {p_chore_id: string};
        Returns: string;
      };
      fn_retract_feedback: {
        Args: {p_feedback_id: string};
        Returns: undefined;
      };
      fn_skip_assignment: {
        Args: {p_assignment_id: string};
        Returns: undefined;
      };
    };
    Enums: {
      assignment_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'disputed';
      feedback_status: 'queued' | 'released' | 'read' | 'retracted';
      household_profile: 'duo' | 'shared_flat' | 'co_living';
      ledger_entry_type:
        | 'chore_completed'
        | 'turn_debit'
        | 'turn_credit'
        | 'market_swap'
        | 'market_bounty'
        | 'market_sublet'
        | 'dispute_adjustment'
        | 'onboarding_baseline';
    };
    CompositeTypes: Record<string, never>;
  };
}
