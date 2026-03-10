import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import type { OutingRecord } from "@/types/outing";

async function getOutingById(supabase: ReturnType<typeof createSupabaseServerClient>, id: string): Promise<OutingRecord | null> {
  const { data: o, error } = await supabase.from("outings").select("id, place, outing_date, comment, created_at").eq("id", id).single();
  if (error || !o) return null;
  const [dollsRes, imagesRes] = await Promise.all([
    supabase.from("outing_dolls").select("doll_id").eq("outing_id", id),
    supabase.from("outing_images").select("image_url").eq("outing_id", id).order("sort_order").order("created_at"),
  ]);
  const doll_ids = (dollsRes.data ?? []).map((d) => d.doll_id);
  const image_urls = (imagesRes.data ?? []).map((r) => toPublicUrl(r.image_url));
  let dolls: { id: string; name: string; color: string; image_url: string | null }[] = [];
  if (doll_ids.length > 0) {
    const { data: dollRows } = await supabase.from("dolls").select("id, name, color").in("id", doll_ids);
    const dollList = dollRows ?? [];
    const withImages = await Promise.all(
      dollList.map(async (d) => {
        const { data: img } = await supabase.from("doll_images").select("image_url").eq("doll_id", d.id).order("sort_order").order("created_at").limit(1).single();
        return { ...d, image_url: img?.image_url ? toPublicUrl(img.image_url) : null };
      })
    );
    dolls = withImages;
  }
  return {
    ...o,
    comment: o.comment ?? null,
    image_url: null,
    created_at: o.created_at ?? new Date().toISOString(),
    doll_ids,
    image_urls,
    dolls,
  };
}

/** GET /api/outings/:id */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const outing = await getOutingById(supabase, id);
  if (!outing) {
    return NextResponse.json({ error: "指定のお出かけ日記が見つかりません" }, { status: 404 });
  }
  return NextResponse.json(outing);
}

/** PUT /api/outings/:id */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const { id } = await params;
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
  const { error: updateError } = await supabase.from("outings").update({ place, outing_date, comment: body.comment?.trim() || null }).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
  await supabase.from("outing_dolls").delete().eq("outing_id", id);
  for (const dollId of doll_ids) {
    await supabase.from("outing_dolls").insert({ outing_id: id, doll_id: dollId });
  }
  const outing = await getOutingById(supabase, id);
  if (!outing) return NextResponse.json({ error: "指定のお出かけ日記が見つかりません" }, { status: 404 });
  return NextResponse.json(outing);
}

/** DELETE /api/outings/:id */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(null as unknown as NextRequest);
  if (auth) return auth;
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("outings").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
