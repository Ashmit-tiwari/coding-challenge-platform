import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { ok, fail } from "@/lib/api";

// POST /api/admin/login
// Body: { username, password }
// Admin password is verified against the salted hash stored in DB (seeded from env).
// The literal "Nevermissme" never appears in client bundles or committed source.
export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try { body = await req.json(); } catch { return fail("Invalid JSON"); }
  const { username, password } = body;
  if (!username || !password) return fail("Username and password required");
  const admin = await db.adminUser.findUnique({ where: { username } });
  if (!admin) return fail("Invalid admin credentials", 401);
  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) return fail("Invalid admin credentials", 401);
  await setSessionCookie({ userId: admin.id, role: "admin", uid: admin.username, name: admin.username }, "admin");
  await db.auditLog.create({
    data: { adminId: admin.id, action: "admin_login", details: JSON.stringify({ username }) },
  });
  return ok({ admin: { id: admin.id, username: admin.username, role: admin.role } });
}
