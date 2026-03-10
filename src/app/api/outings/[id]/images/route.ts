import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import { getBucket } from "@/lib/supabase/storage";
import type { OutingRecord } from "@/types/outing";
import { randomUUID } from "crypto";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

async function getOutingById(supabase: ReturnType<typeof createSupabaseServerClient>, id: string): Promise<OutingRecord | null> {
  const { data: o, error } = await supabase.from("outings").select("id, place, outing_date, comment, created_at").eq("id", id).single();
  if (error || !o) return null;
  const [dollsRes, imagesRes] = await Promise.all([
    supabase.from("outing_dolls").select("doll_id").eq("outing_id", id),
    supabase.from("outing_images").select("image_url").eq("outing_id", id).order("sort_order").order("created_at"),
  ]);
  const doll_ids = (dollsRes.data ?? []).map((d) => d.doll_id);
  const image_urls = (imagesRes.data ?? []).map((r) => toPublicUrl(r.image_url));
  return { ...o, comment: o.comment ?? null, image_url: null, created_at: o.created_at ?? new Date().toISOString(), doll_ids, image_urls };
}

/** POST /api/outings/:id/images */
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
    const path = `outings/${id}/${randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (uploadError) {
      return NextResponse.json({ error: "画像のアップロードに失敗しました" }, { status: 500 });
    }
    await supabase.from("outing_images").insert({ outing_id: id, image_url: path, sort_order: i });
  }
  const outing = await getOutingById(supabase, id);
  if (!outing) return NextResponse.json({ error: "指定のお出かけ日記が見つかりません" }, { status: 404 });
  return NextResponse.json(outing);
}
