import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthApi } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/storage";
import type { Doll } from "@/types/doll";

const SELECTED_WEIGHT = 0.008;
const UNSELECTED_WEIGHT = 1;

/** POST /api/roulette/spin */
export async function POST(req: NextRequest) {
  const auth = await requireAuthApi(req);
  if (auth) return auth;
  const supabase = createSupabaseServerClient();
  const { data: dolls, error: listError } = await supabase
    .from("dolls")
    .select("id, name, color, is_selected, created_at")
    .order("created_at", { ascending: true });
  if (listError || !dolls?.length) {
    return NextResponse.json({ error: "かぞくが1人も登録されていません" }, { status: 400 });
  }
  const allSelected = dolls.every((d) => d.is_selected);
  if (allSelected) {
    return NextResponse.json({ allDone: true });
  }
  const weights = dolls.map((d) => (d.is_selected ? SELECTED_WEIGHT : UNSELECTED_WEIGHT));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let index = 0;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      index = i;
      break;
    }
  }
  const selected = dolls[index];
  if (!selected) {
    return NextResponse.json({ error: "抽選に失敗しました" }, { status: 500 });
  }
  const wasAlreadySelected = selected.is_selected;
  const { data: images } = await supabase
    .from("doll_images")
    .select("image_url")
    .eq("doll_id", selected.id)
    .order("sort_order")
    .order("created_at");
  const candidateUrls = (images ?? []).map((r) => r.image_url).filter(Boolean);
  const chosenPath = candidateUrls.length > 0 ? candidateUrls[Math.floor(Math.random() * candidateUrls.length)] : null;

  const { error: updateError } = await supabase.from("dolls").update({ is_selected: true }).eq("id", selected.id);
  if (updateError) {
    return NextResponse.json({ error: "ルーレットに失敗しました" }, { status: 500 });
  }
  const { error: insertError } = await supabase.from("histories").insert({ doll_id: selected.id, doll_image_url: chosenPath });
  if (insertError) {
    return NextResponse.json({ error: "ルーレットに失敗しました" }, { status: 500 });
  }

  const image_urls = (images ?? []).map((r) => toPublicUrl(r.image_url));
  const doll: Doll = {
    ...selected,
    image_url: chosenPath ? toPublicUrl(chosenPath) : null,
    image_urls,
    created_at: selected.created_at ?? new Date().toISOString(),
  };
  return NextResponse.json({ doll, luckySecond: wasAlreadySelected });
}
