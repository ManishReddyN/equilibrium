import {SUPABASE_URL, SUPABASE_ANON_KEY} from '@env';
import {z} from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = envSchema.parse({SUPABASE_URL, SUPABASE_ANON_KEY});
