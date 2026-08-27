import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";

// GET /api/notifications?unreadOnly=true
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const where: any = { userId: session.userId };
  if (unreadOnly) where.read = false;
  const notes = await db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = await db.notification.count({ where: { userId: session.userId, read: false } });
  return ok({ notifications: notes, unreadCount });
}

// POST /api/notifications/read  { id } or { all: true }
export async function POST(req: NextRequest) {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  let body: { id?: string; all?: boolean };
  try { body = await req.json(); } catch { return ok({ ok: false }); }
  if (body.all) {
    await db.notification.updateMany({ where: { userId: session.userId, read: false }, data: { read: true } });
  } else if (body.id) {
    await db.notification.updateMany({ where: { id: body.id, userId: session.userId }, data: { read: true } });
  }
  return ok({ ok: true });
}
