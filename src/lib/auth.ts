import { NextRequest, NextResponse } from "next/server";
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

/** API 用: 未認証なら 401 の NextResponse を返す。認証済みなら null */
export async function requireAuthApi(_req: NextRequest): Promise<NextResponse | null> {
  if (!APP_PASSWORD) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? null;
  if (verifyAuthToken(token)) return null;
  return NextResponse.json({ error: "パスワードを入力してください" }, { status: 401 });
}
