import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const APP_PASSWORD = process.env.APP_PASSWORD ?? "";
const COOKIE_NAME = "dr_auth";

function createAuthToken(): string {
  if (!APP_PASSWORD) return "";
  return crypto.createHmac("sha256", APP_PASSWORD).update("auth").digest("hex");
}

function verifyAuthToken(token: string | null): boolean {
  if (!APP_PASSWORD) return true;
  if (!token) return false;
  const expected = Buffer.from(createAuthToken(), "hex");
  let actual: Buffer;
  try {
    actual = Buffer.from(token, "hex");
  } catch {
    return false;
  }
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

/** GET /api/auth/check - Cookie が有効なら 200、無効なら 401 */
export async function GET() {
  if (!APP_PASSWORD) {
    return NextResponse.json({ ok: true });
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? null;
  if (verifyAuthToken(token)) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "未認証" }, { status: 401 });
}
