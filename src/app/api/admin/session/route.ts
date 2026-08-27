import { db } from "@/lib/db";
import { getAdminSession, clearSessionCookie } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";

// GET /api/admin/session — check current admin session
// If the admin cookie is invalid/expired, clear it so the browser stops
// sending a stale token on every subsequent request (prevents auth loops).
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    await clearSessionCookie("admin");
    return unauthorized("Not an admin session");
  }
  const admin = await db.adminUser.findUnique({ where: { id: session.userId } });
  if (!admin) {
    await clearSessionCookie("admin");
    return unauthorized("Admin not found");
  }
  return ok({ admin: { id: admin.id, username: admin.username, role: admin.role } });
}
