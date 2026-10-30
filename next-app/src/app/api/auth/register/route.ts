import { NextRequest, NextResponse } from "next/server";
import { registerUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { readJson, requireSameOrigin } from "@/lib/api";
import { validateRegistration } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const validation = validateRegistration(await readJson(request));
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  if (validation.value.role === "operator" && process.env.DEMO_OPERATOR_REGISTRATION !== "true") {
    return NextResponse.json({ error: "Operator registration is disabled." }, { status: 403 });
  }

  try {
    const { user, token } = await registerUser(
      validation.value.username,
      validation.value.password,
      validation.value.role,
    );
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error &&
        error.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration service is unavailable." }, { status: 503 });
  }
}
