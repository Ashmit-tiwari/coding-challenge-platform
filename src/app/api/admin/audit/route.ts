import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ok, unauthorized, safeJson } from "@/lib/api";

// GET /api/admin/audit?limit=100
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
  const action = url.searchParams.get("action");
  const where: any = {};
  if (action) where.action = action;
  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { username: true } } },
  });
  return ok({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      target: l.target,
      details: safeJson(l.details, {}),
      admin: l.admin?.username || null,
      ip: l.ip,
      createdAt: l.createdAt,
    })),
  });
}
