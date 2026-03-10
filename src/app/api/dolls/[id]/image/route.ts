import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import { getBucket } from "@/lib/supabase/storage";
import type { Doll } from "@/types/doll";
import { randomUUID } from "crypto";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

async function getDollWithImages(supabase: ReturnType<typeof createSupabaseServerClient>, id: string): Promise<Doll | null> {
  const { data: d, error } = await supabase.from("dolls").select("id, name, color, is_selected, created_at").eq("id", id).single();
  if (error || !d) return null;
  const { data: imgs } = await supabase.from("doll_images").select("image_url").eq("doll_id", id).order("sort_order").order("created_at");
  const image_urls = (imgs ?? []).map((r) => toPublicUrl(r.image_url));
  return { ...d, image_url: image_urls[0] ?? null, image_urls, created_at: d.created_at ?? new Date().toISOString() };
}

/** POST /api/dolls/:id/image - 代表画像1枚 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const { id } = await params;
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "画像ファイルを選択してください" }, { status: 400 });
  }
  const ext = MIME_EXT[file.type] ?? ".jpg";
  const path = `dolls/${id}/${randomUUID()}${ext}`;
  const supabase = createSupabaseServerClient();
  const bucket = getBucket();
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (uploadError) {
    return NextResponse.json({ error: "画像のアップロードに失敗しました" }, { status: 500 });
  }
  const { data: existing } = await supabase.from("doll_images").select("id, image_url").eq("doll_id", id).eq("sort_order", 0).limit(1).single();
  if (existing) {
    await supabase.from("doll_images").update({ image_url: path }).eq("id", existing.id);
  } else {
    await supabase.from("doll_images").insert({ doll_id: id, image_url: path, sort_order: 0 });
  }
  const doll = await getDollWithImages(supabase, id);
  if (!doll) return NextResponse.json({ error: "指定のかぞくが見つかりません" }, { status: 404 });
  return NextResponse.json(doll);
}
