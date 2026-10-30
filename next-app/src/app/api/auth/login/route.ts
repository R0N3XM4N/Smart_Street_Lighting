import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { readJson, requireSameOrigin } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Provide a username and password." }, { status: 400 });
  }
  const { username, password } = body as Record<string, unknown>;
  if (typeof username !== "string" || username.trim().length < 1 ||
      username.length > 100 || typeof password !== "string" || password.length < 1 ||
      password.length > 200) {
    return NextResponse.json({ error: "Provide a valid username and password." }, { status: 400 });
  }
  try {
    const user = await authenticate(username.trim(), password);
    if (!user) return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    const token = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Authentication service is unavailable." }, { status: 503 });
  }
}
