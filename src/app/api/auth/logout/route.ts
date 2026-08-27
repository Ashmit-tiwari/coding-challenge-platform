import { clearSessionCookie, getStudentSession, getAdminSession } from "@/lib/session";
import { ok } from "@/lib/api";

// POST /api/auth/logout
export async function POST() {
  const student = await getStudentSession();
  const admin = await getAdminSession();
  if (student) await clearSessionCookie("student");
  if (admin) await clearSessionCookie("admin");
  return ok({ ok: true });
}
