import { describe, expect, it } from "vitest";
import { decideAccess, isSameOrigin, sessionCookieOptions } from "./security";

describe("operator access policy", () => {
  it("allows an operator to write", () => {
    expect(decideAccess("operator", "operator")).toBe("allowed");
  });

  it("denies a viewer from operator write workflows", () => {
    expect(decideAccess("viewer", "operator")).toBe("forbidden");
  });

  it("does not grant access without a session role", () => {
    expect(decideAccess(null, "viewer")).toBe("unauthenticated");
  });
});

describe("same-origin mutation protection", () => {
  it("accepts requests from the exact application origin", () => {
    expect(isSameOrigin("https://lumen.example", "https://lumen.example")).toBe(true);
  });

  it("treats localhost and loopback IP aliases as the same local origin", () => {
    expect(isSameOrigin("http://localhost:3000", "http://127.0.0.1:3000")).toBe(true);
    expect(isSameOrigin("http://127.0.0.1:3000", "http://localhost:3000")).toBe(true);
  });

  it("rejects foreign, missing, and malformed origins", () => {
    expect(isSameOrigin("https://attacker.example", "https://lumen.example")).toBe(false);
    expect(isSameOrigin("http://attacker.example:3000", "http://127.0.0.1:3000")).toBe(false);
    expect(isSameOrigin("http://localhost:3001", "http://127.0.0.1:3000")).toBe(false);
    expect(isSameOrigin("https://lumen.example/extra", "https://lumen.example")).toBe(false);
    expect(isSameOrigin(null, "https://lumen.example")).toBe(false);
    expect(isSameOrigin("not-an-origin", "https://lumen.example")).toBe(false);
  });
});

describe("session cookie security", () => {
  it("uses httpOnly, sameSite and secure in production", () => {
    expect(sessionCookieOptions({ NODE_ENV: "production" })).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("uses secure cookies in local HTTPS mode and clamps invalid TTL to a safe default", () => {
    expect(sessionCookieOptions({ COOKIE_SECURE: "true", SESSION_TTL_HOURS: "999" })).toMatchObject({
      secure: true,
      maxAge: 12 * 60 * 60,
    });
  });
});
