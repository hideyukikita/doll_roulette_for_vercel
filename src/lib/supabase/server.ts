import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Server Component / Route Handler 用。認証は自前 Cookie のため、anon key のみで DB にアクセス */
export function createSupabaseServerClient() {
  return createClient(url, anonKey);
}

/**
 * RLS をバイパスするサーバー専用クライアント。
 * リセットなど管理者操作で使用。SUPABASE_SERVICE_ROLE_KEY が未設定の場合は anon クライアントを返す。
 */
export function createSupabaseServiceClient(): SupabaseClient {
  if (serviceRoleKey) {
    return createClient(url, serviceRoleKey);
  }
  return createClient(url, anonKey);
}
