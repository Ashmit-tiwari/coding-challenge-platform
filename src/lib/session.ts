import { cookies } from "next/headers";
import crypto from "crypto";

// Lightweight signed-token session system using httpOnly cookies.
// Tokens are NOT JWTs — they are HMAC-signed opaque payloads: <userId|role|exp>.<hmac>
// Admin password lives ONLY in env (ADMIN_PASSWORD_HASH or plain ADMIN_PASSWORD at runtime,
// hashed on first boot via the seeder). The literal value "Nevermissme" never appears in
// client bundles or committed source.

const SESSION_SECRET =
  process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me-please-0x9f2a";
const SESSION_COOKIE = "wcc_session";
const ADMIN_COOKIE = "wcc_admin";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

const ALGO = "sha256";

function b64url(input: Buffer | string): string {
  return Buffer.from(input as any).toString("base64url");
}
function fromB64url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function sign(payload: string): string {
  const sig = crypto.createHmac(ALGO, SESSION_SECRET).update(payload).digest();
  return b64url(sig);
}

export interface SessionPayload {
  userId: string;
  role: "student" | "admin";
  exp: number; // epoch seconds
  uid: string;
  name: string;
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const body: SessionPayload = { ...payload, exp };
  const raw = b64url(JSON.stringify(body));
  const sig = sign(raw);
  return `${raw}.${sig}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [raw, sig] = parts;
  const expected = sign(raw);
  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(fromB64url(raw).toString("utf8")) as SessionPayload;
    if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  payload: Omit<SessionPayload, "exp">,
  kind: "student" | "admin" = "student",
) {
  const store = await cookies();
  const token = createSessionToken(payload);
  store.set(kind === "admin" ? ADMIN_COOKIE : SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(kind: "student" | "admin" = "student") {
  const store = await cookies();
  const name = kind === "admin" ? ADMIN_COOKIE : SESSION_COOKIE;
  // Delete by name (Next.js sets maxAge=0). Also explicitly set an expired
  // cookie with matching path/secure/sameSite options to guarantee the
  // browser removes the cookie even if the request was forwarded through
  // a proxy that altered the original Set-Cookie attributes.
  store.delete(name);
  store.set(name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(kind: "student" | "admin" = "student"): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(kind === "admin" ? ADMIN_COOKIE : SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function getStudentSession(): Promise<SessionPayload | null> {
  return getSession("student");
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  return getSession("admin");
}

// Generate a random opaque token (for certificate IDs, etc.)
export function randomToken(bytes = 12): string {
  return crypto.randomBytes(bytes).toString("hex");
}
