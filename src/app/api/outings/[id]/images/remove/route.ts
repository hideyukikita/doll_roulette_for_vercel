import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import type { OutingRecord } from "@/types/outing";

function toStoragePath(urlOrPath: string): string {
  const s = urlOrPath.trim();
  if (s.startsWith("http")) {
    const m = s.match(/\/storage\/v1\/object\/public\/uploads\/(.+)$/);
    return m ? m[1] : s;
  }
  return s.replace(/^\/+/, "").replace(/^uploads\//, "");
}

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

/** POST /api/outings/:id/images/remove */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const { id } = await params;
  let body: { image_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "image_url を指定してください" }, { status: 400 });
  }
  const imageUrl = typeof body?.image_url === "string" ? body.image_url.trim() : "";
  if (!imageUrl) {
    return NextResponse.json({ error: "image_url を指定してください" }, { status: 400 });
  }
  const path = toStoragePath(imageUrl);
  const supabase = createSupabaseServerClient();
  const { data: rows } = await supabase.from("outing_images").select("id, image_url").eq("outing_id", id);
  const match = (rows ?? []).find((r) => toPublicUrl(r.image_url) === imageUrl || r.image_url === imageUrl || r.image_url === path);
  if (!match) {
    return NextResponse.json({ error: "指定の画像が見つかりません" }, { status: 404 });
  }
  await supabase.from("outing_images").delete().eq("id", match.id);
  const outing = await getOutingById(supabase, id);
  if (!outing) return NextResponse.json({ error: "指定のお出かけ日記が見つかりません" }, { status: 404 });
  return NextResponse.json(outing);
}
