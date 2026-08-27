import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { parseUid } from "@/lib/uid";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { ok, fail, publicUser } from "@/lib/api";

// POST /api/auth/login
// Body: { uid, password }
export async function POST(req: NextRequest) {
  try {
    let body: { uid?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return fail("Invalid JSON body", 400);
    }
    const { uid, password } = body;
    if (!uid || !password) {
      return fail("UID and password are required", 400);
    }
    const parsed = parseUid(uid);
    if (!parsed.valid) {
      return fail(parsed.error || "Invalid UID format", 400);
    }
    const user = await db.user.findUnique({
      where: { uid: parsed.uid },
      include: { avatar: true },
    });
    if (!user) {
      return fail("No account found for this UID. Please click Register first.", 404);
    }
    if (user.isBanned) {
      return fail("Your account has been suspended. Contact the administrator.", 403);
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return fail("Incorrect password. Please verify and try again.", 401);
    }
    await setSessionCookie({ userId: user.id, role: "student", uid: user.uid, name: user.name });
    return ok({ user: publicUser(user) });
  } catch (err: any) {
    console.error("Login Server Error:", err);
    return fail(err?.message || "Internal database connection error. Verify Vercel environment variables.", 500);
  }
}
