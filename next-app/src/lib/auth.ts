import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { getPool } from "@/lib/db";

export const SESSION_COOKIE = "streetlight_session";
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? "12");

export type { UserRole } from "@/lib/access-types";
import type { UserRole } from "@/lib/access-types";
export type SessionUser = { id: number; username: string; role: UserRole };

function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export { sessionCookieOptions } from "@/lib/security";

export async function authenticate(username: string, password: string): Promise<SessionUser | null> {
  const [rows] = await getPool().execute(
    "SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1",
    [username],
  );
  const user = (rows as Array<{
    id: number;
    username: string;
    password_hash: string;
    role: UserRole;
  }>)[0];
  if (!user || !["viewer", "operator"].includes(user.role)) return null;
  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) return null;
  return { id: user.id, username: user.username, role: user.role };
}

export async function createSession(userId: number): Promise<string> {
  if (!Number.isInteger(SESSION_TTL_HOURS) || SESSION_TTL_HOURS < 1 || SESSION_TTL_HOURS > 168) {
    throw new Error("SESSION_TTL_HOURS must be between 1 and 168");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  await getPool().execute(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [tokenDigest(token), userId, expiresAt],
  );
  return token;
}

export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;
  const [rows] = await getPool().execute(
    `SELECT u.id, u.username, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
      LIMIT 1`,
    [tokenDigest(token)],
  );
  const user = (rows as Array<SessionUser>)[0];
  if (!user || !["viewer", "operator"].includes(user.role)) return null;
  return user;
}

export async function deleteSession(token: string): Promise<void> {
  await getPool().execute("DELETE FROM sessions WHERE token_hash = ?", [tokenDigest(token)]);
}
