import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { decideAccess, isSameOrigin } from "@/lib/security";

export function requireSameOrigin(request: NextRequest) {
  if (isSameOrigin(request.headers.get("origin"), request.nextUrl.origin)) return null;
  return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
}

export async function requireUser(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  return { user, response: null };
}

export async function requireUserOrDemoViewer(request: NextRequest) {
  const user = await getSessionUser(request);
  if (user) return { user, response: null };
  if (process.env.LOCAL_READ_ONLY_DEMO === "true") return { user: null, response: null };
  return {
    user: null,
    response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
  };
}

export async function requireOperator(request: NextRequest) {
  const result = await requireUser(request);
  if (result.response) return result;
  if (decideAccess(result.user?.role ?? null, "operator") !== "allowed") {
    return {
      user: result.user,
      response: NextResponse.json({ error: "Operator role required." }, { status: 403 }),
    };
  }
  return result;
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
