import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import type { OutingRecord } from "@/types/outing";

/** GET /api/outings - 一覧 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const supabase = createSupabaseServerClient();
  const { data: outings, error } = await supabase
    .from("outings")
    .select("id, place, outing_date, comment, created_at")
    .order("outing_date", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: "一覧の取得に失敗しました" }, { status: 500 });
  }
  const result: OutingRecord[] = [];
  for (const o of outings ?? []) {
    const [dollsRes, imagesRes] = await Promise.all([
      supabase.from("outing_dolls").select("doll_id").eq("outing_id", o.id),
      supabase.from("outing_images").select("image_url").eq("outing_id", o.id).order("sort_order").order("created_at"),
    ]);
    const doll_ids = (dollsRes.data ?? []).map((d) => d.doll_id);
    const image_urls = (imagesRes.data ?? []).map((r) => toPublicUrl(r.image_url));
    result.push({
      ...o,
      comment: o.comment ?? null,
      image_url: null,
      created_at: o.created_at ?? new Date().toISOString(),
      doll_ids,
      image_urls,
    });
  }
  return NextResponse.json(result);
}

/** POST /api/outings - 登録 */
export async function POST(req: NextRequest) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  let body: { place?: string; outing_date?: string; comment?: string; doll_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const place = body?.place?.trim();
  const outing_date = body?.outing_date;
  const doll_ids = Array.isArray(body?.doll_ids) ? body.doll_ids : [];
  if (!place || !outing_date) {
    return NextResponse.json({ error: "場所と日付は必須です" }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("outings")
    .insert({ place, outing_date, comment: body.comment?.trim() || null })
    .select("id, place, outing_date, comment, created_at")
    .single();
  if (error) {
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
  for (const dollId of doll_ids) {
    await supabase.from("outing_dolls").insert({ outing_id: row.id, doll_id: dollId });
  }
  const outing: OutingRecord = {
    ...row,
    comment: row.comment ?? null,
    image_url: null,
    created_at: row.created_at ?? new Date().toISOString(),
    doll_ids,
    image_urls: [],
  };
  return NextResponse.json(outing, { status: 201 });
}
