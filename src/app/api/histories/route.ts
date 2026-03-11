import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import type { HistoryRecord } from "@/types/history";

/** GET /api/histories */
export async function GET(req: NextRequest) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const supabase = createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("histories")
    .select("id, doll_id, selected_at, doll_image_url, dolls(name, color)")
    .order("selected_at", { ascending: false })
    .limit(limit);
  if (error) {
    return NextResponse.json({ error: "履歴の取得に失敗しました" }, { status: 500 });
  }
  type DollsRef = { name: string; color: string } | { name: string; color: string }[] | null;
  type Row = { id: string; doll_id: string; selected_at: string; doll_image_url: string | null; dolls: DollsRef };
  const list: HistoryRecord[] = (rows ?? []).map((h: Row) => {
    const d = Array.isArray(h.dolls) ? h.dolls[0] : h.dolls;
    return {
      id: h.id,
      doll_id: h.doll_id,
      selected_at: h.selected_at,
      doll_name: d?.name ?? "",
      doll_color: d?.color ?? undefined,
      doll_image_url: h.doll_image_url ? toPublicUrl(h.doll_image_url) : null,
    };
  });
  return NextResponse.json(list);
}
