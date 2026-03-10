import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import { getBucket } from "@/lib/supabase/storage";
import type { Doll } from "@/types/doll";

async function getDollWithImages(supabase: ReturnType<typeof createSupabaseServerClient>, id: string): Promise<Doll | null> {
  const { data: d, error } = await supabase.from("dolls").select("id, name, color, is_selected, created_at").eq("id", id).single();
  if (error || !d) return null;
  const { data: imgs } = await supabase.from("doll_images").select("image_url").eq("doll_id", id).order("sort_order").order("created_at");
  const image_urls = (imgs ?? []).map((r) => toPublicUrl(r.image_url));
  return { ...d, image_url: image_urls[0] ?? null, image_urls, created_at: d.created_at ?? new Date().toISOString() };
}

/** フルURLまたはパスから Storage パス部分のみ取得（dolls/... または outings/...） */
function toStoragePath(urlOrPath: string): string {
  const s = urlOrPath.trim();
  if (s.startsWith("http")) {
    const m = s.match(/\/storage\/v1\/object\/public\/uploads\/(.+)$/);
    return m ? m[1] : s;
  }
  return s.replace(/^\/+/, "").replace(/^uploads\//, "");
}

/** POST /api/dolls/:id/images/remove */
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
  const { data: deleted } = await supabase.from("doll_images").delete().eq("doll_id", id).eq("image_url", path).select("id").single();
  if (!deleted) {
    const { data: byUrl } = await supabase.from("doll_images").select("id, image_url").eq("doll_id", id);
    const match = (byUrl ?? []).find((r) => toPublicUrl(r.image_url) === imageUrl || r.image_url === imageUrl || r.image_url === path);
    if (!match) {
      return NextResponse.json({ error: "指定の画像が見つかりません" }, { status: 404 });
    }
    await supabase.from("doll_images").delete().eq("id", match.id);
  }
  const doll = await getDollWithImages(supabase, id);
  if (!doll) return NextResponse.json({ error: "指定のかぞくが見つかりません" }, { status: 404 });
  return NextResponse.json(doll);
}
