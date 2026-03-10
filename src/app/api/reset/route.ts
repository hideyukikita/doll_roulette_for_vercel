import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";

/** POST /api/reset - 全員の選択状態と当選履歴をリセット */
export async function POST(req: NextRequest) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const supabase = createSupabaseServerClient();
  const { error: delError } = await supabase.from("histories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delError) {
    return NextResponse.json({ error: "リセットに失敗しました" }, { status: 500 });
  }
  const { data: updated, error: updateError } = await supabase.from("dolls").update({ is_selected: false }).select("id");
  if (updateError) {
    return NextResponse.json({ error: "リセットに失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, resetCount: updated?.length ?? 0 });
}
