import { NextRequest, NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    if (token) await deleteSession(token);
  } catch (error) {
    console.error("Session cleanup failed:", error);
    return NextResponse.json({ error: "Could not end the session." }, { status: 503 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
