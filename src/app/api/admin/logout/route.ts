import { clearSessionCookie } from "@/lib/session";
import { ok } from "@/lib/api";

// POST /api/admin/logout
// Always clear the admin session cookie, regardless of whether the current
// token is valid. This ensures stale/expired cookies are purged on explicit
// logout so they cannot cause auth-check loops on subsequent navigations.
export async function POST() {
  await clearSessionCookie("admin");
  return ok({ ok: true });
}
