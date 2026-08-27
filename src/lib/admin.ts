import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

// Resolve the current admin from the session cookie. Returns null if not authenticated.
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) return null;
  const admin = await db.adminUser.findUnique({ where: { id: session.userId } });
  return admin;
}

export async function writeAudit(adminId: string | null, action: string, target?: string, details?: any, ip?: string) {
  try {
    await db.auditLog.create({
      data: {
        adminId,
        action,
        target,
        details: JSON.stringify(details || {}),
        ip: ip || null,
      },
    });
  } catch (e) {
    // never fail a request because of audit logging
  }
}
