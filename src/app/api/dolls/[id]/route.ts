import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import type { Doll } from "@/types/doll";

async function getDollWithImages(supabase: ReturnType<typeof createSupabaseServerClient>, id: string): Promise<Doll | null> {
  const { data: d, error } = await supabase
    .from("dolls")
    .select("id, name, color, is_selected, created_at")
    .eq("id", id)
    .single();
  if (error || !d) return null;
  const { data: imgs } = await supabase
    .from("doll_images")
    .select("image_url")
    .eq("doll_id", id)
    .order("sort_order")
    .order("created_at");
  const image_urls = (imgs ?? []).map((r) => toPublicUrl(r.image_url));
  return {
    ...d,
    image_url: image_urls[0] ?? null,
    image_urls,
    created_at: d.created_at ?? new Date().toISOString(),
  };
}

/** PUT /api/dolls/:id */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const { id } = await params;
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
  const { error: updateError } = await supabase.from("dolls").update({ name, color }).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
  const doll = await getDollWithImages(supabase, id);
  if (!doll) return NextResponse.json({ error: "指定のかぞくが見つかりません" }, { status: 404 });
  return NextResponse.json(doll);
}

/** DELETE /api/dolls/:id */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(null as unknown as NextRequest);
  if (auth) return auth;
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("dolls").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
