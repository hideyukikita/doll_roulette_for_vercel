import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Server Component / Route Handler 用。認証は自前 Cookie のため、anon key のみで DB にアクセス */
export function createSupabaseServerClient() {
  return createClient(url, anonKey);
}
