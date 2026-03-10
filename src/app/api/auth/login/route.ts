import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const APP_PASSWORD = process.env.APP_PASSWORD ?? "";
const COOKIE_NAME = "dr_auth";
const COOKIE_MAX_AGE_DAYS = 7;

function createAuthToken(): string {
  if (!APP_PASSWORD) return "";
  return crypto.createHmac("sha256", APP_PASSWORD).update("auth").digest("hex");
}

/** POST /api/auth/login - パスワード照合し、OK なら Cookie をセット */
export async function POST(req: NextRequest) {
  if (!APP_PASSWORD) {
    return NextResponse.json({ ok: true });
  }
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const password = typeof body?.password === "string" ? body.password : "";
  if (password !== APP_PASSWORD) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }
  const token = createAuthToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
  });
  return NextResponse.json({ ok: true });
}
