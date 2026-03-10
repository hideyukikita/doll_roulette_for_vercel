import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";

/** DELETE /api/histories/:id */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { data: row } = await supabase.from("histories").select("doll_id").eq("id", id).single();
  if (!row) {
    return NextResponse.json({ error: "指定の履歴が見つかりません" }, { status: 404 });
  }
  const { error: delError } = await supabase.from("histories").delete().eq("id", id);
  if (delError) {
    return NextResponse.json({ error: "履歴の削除に失敗しました" }, { status: 500 });
  }
  await supabase.from("dolls").update({ is_selected: false }).eq("id", row.doll_id);
  return new NextResponse(null, { status: 204 });
}
