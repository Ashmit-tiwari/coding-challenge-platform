import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";

// GET /api/admin/session — check current admin session
export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorized("Not an admin session");
  const admin = await db.adminUser.findUnique({ where: { id: session.userId } });
  if (!admin) return unauthorized("Admin not found");
  return ok({ admin: { id: admin.id, username: admin.username, role: admin.role } });
}
