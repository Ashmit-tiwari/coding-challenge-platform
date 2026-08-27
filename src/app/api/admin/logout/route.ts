import { clearSessionCookie, getAdminSession } from "@/lib/session";
import { ok } from "@/lib/api";

export async function POST() {
  const admin = await getAdminSession();
  if (admin) await clearSessionCookie("admin");
  return ok({ ok: true });
}
