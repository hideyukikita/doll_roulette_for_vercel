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

/** POST /api/dolls/:id/images - 複数画像アップロード */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const { id } = await params;
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "画像ファイルを1枚以上選択してください" }, { status: 400 });
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: "画像ファイルを1枚以上選択してください" }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();
  const bucket = getBucket();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = MIME_EXT[file.type] ?? ".jpg";
    const path = `dolls/${id}/${randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (uploadError) {
      return NextResponse.json({ error: "画像のアップロードに失敗しました" }, { status: 500 });
    }
    await supabase.from("doll_images").insert({ doll_id: id, image_url: path, sort_order: i + 100 });
  }
  const doll = await getDollWithImages(supabase, id);
  if (!doll) return NextResponse.json({ error: "指定のかぞくが見つかりません" }, { status: 404 });
  return NextResponse.json(doll);
}
