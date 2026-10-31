import type { UserRole } from "@/lib/access-types";

export type AccessDecision = "allowed" | "unauthenticated" | "forbidden";

export function decideAccess(role: UserRole | null, required: "viewer" | "operator"): AccessDecision {
  if (!role) return "unauthenticated";
  if (required === "operator" && role !== "operator") return "forbidden";
  return "allowed";
}

export function isSameOrigin(origin: string | null, expectedOrigin: string): boolean {
  if (!origin || !expectedOrigin) return false;
  try {
    const requestOrigin = new URL(origin);
    const applicationOrigin = new URL(expectedOrigin);
    if (origin !== requestOrigin.origin) return false;
    if (requestOrigin.origin === applicationOrigin.origin) return true;

    const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return requestOrigin.protocol === applicationOrigin.protocol &&
      requestOrigin.port === applicationOrigin.port &&
      loopbackHosts.has(requestOrigin.hostname) &&
      loopbackHosts.has(applicationOrigin.hostname);
  } catch {
    return false;
  }
}

export function sessionCookieOptions(environment: Record<string, string | undefined> = process.env) {
  const ttl = Number(environment.SESSION_TTL_HOURS ?? "12");
  return {
    httpOnly: true,
    secure: environment.NODE_ENV === "production" || environment.COOKIE_SECURE === "true",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Number.isInteger(ttl) && ttl >= 1 && ttl <= 168 ? ttl * 60 * 60 : 12 * 60 * 60,
  };
}
