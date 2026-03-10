import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import type { Doll } from "@/types/doll";

/** GET /api/dolls - 一覧 */
export async function GET() {
  const auth = await requireAuthApi(null as unknown as NextRequest);
  if (auth) return auth;
  const supabase = createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("dolls")
    .select("id, name, color, is_selected, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "一覧の取得に失敗しました" }, { status: 500 });
  }
  const dolls: Doll[] = await Promise.all(
    (rows ?? []).map(async (d) => {
      const { data: imgs } = await supabase
        .from("doll_images")
        .select("image_url")
        .eq("doll_id", d.id)
        .order("sort_order")
        .order("created_at");
      const image_urls = (imgs ?? []).map((r) => toPublicUrl(r.image_url));
      return {
        ...d,
        image_url: image_urls[0] ?? null,
        image_urls,
        created_at: d.created_at ?? new Date().toISOString(),
      };
    })
  );
  return NextResponse.json(dolls);
}

/** POST /api/dolls - 登録 */
export async function POST(req: NextRequest) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  let body: { name?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const name = body?.name?.trim();
  const color = body?.color?.trim();
  if (!name || !color) {
    return NextResponse.json({ error: "name と color は必須です" }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("dolls")
    .insert({ name, color })
    .select("id, name, color, is_selected, created_at")
    .single();
  if (error) {
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
  const doll: Doll = {
    ...row,
    image_url: null,
    image_urls: [],
    created_at: row.created_at ?? new Date().toISOString(),
  };
  return NextResponse.json(doll, { status: 201 });
}
