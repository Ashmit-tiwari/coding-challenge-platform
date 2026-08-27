import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { parseUid } from "@/lib/uid";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { ok, fail, publicUser } from "@/lib/api";

// POST /api/auth/login
// Body: { uid, password }
export async function POST(req: NextRequest) {
  let body: { uid?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const { uid, password } = body;
  if (!uid || !password) {
    return fail("uid and password are required");
  }
  const parsed = parseUid(uid);
  if (!parsed.valid) {
    return fail(parsed.error || "Invalid UID");
  }
  const user = await db.user.findUnique({
    where: { uid: parsed.uid },
    include: { avatar: true },
  });
  if (!user) {
    return fail("No account found for this UID. Please register first.", 404);
  }
  if (user.isBanned) {
    return fail("Your account has been suspended. Contact the administrator.", 403);
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return fail("Incorrect password.", 401);
  }
  await setSessionCookie({ userId: user.id, role: "student", uid: user.uid, name: user.name });
  return ok({ user: publicUser(user) });
}
