const BUCKET = "uploads";
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Storage のパスを公開 URL に変換 */
export function toPublicUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const trimmed = path.replace(/^\//, "");
  return `${BASE}/storage/v1/object/public/${BUCKET}/${trimmed}`;
}

export function getBucket(): string {
  return BUCKET;
}
