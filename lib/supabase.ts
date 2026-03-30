/**
 * Optional Supabase client — wire auth / persistence when keys are set.
 * import { createClient } from "@supabase/supabase-js";
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
