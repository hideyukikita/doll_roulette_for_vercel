import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return String(e);
}

/** POST /api/reset - 全員の選択状態と当選履歴をリセット（RLS をバイパスするサービスロールを使用） */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthApi(req);
    if (auth) return auth;
    const supabase = createSupabaseServiceClient();

    const { error: delError } = await supabase.from("histories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delError) {
      console.error("[reset] histories delete error:", delError);
      const msg = errMsg(delError);
      return NextResponse.json({ error: `リセットに失敗しました: ${msg}` }, { status: 500 });
    }

    const { data: ids, error: selectError } = await supabase.from("dolls").select("id");
    if (selectError) {
      console.error("[reset] dolls select error:", selectError);
      return NextResponse.json({ error: `リセットに失敗しました: ${errMsg(selectError)}` }, { status: 500 });
    }
    const idList = (ids ?? []).map((r) => r.id);

    const { data: updated, error: updateError } =
      idList.length > 0
        ? await supabase.from("dolls").update({ is_selected: false }).in("id", idList).select("id")
        : { data: [], error: null };
    if (updateError) {
      console.error("[reset] dolls update error:", updateError);
      return NextResponse.json({ error: `リセットに失敗しました: ${errMsg(updateError)}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, resetCount: updated?.length ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reset] unexpected error:", e);
    return NextResponse.json({ error: `リセットに失敗しました: ${msg}` }, { status: 500 });
  }
}
