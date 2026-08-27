import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ok, unauthorized, safeJson } from "@/lib/api";

// GET /api/admin/participants?search=&year=&order=xp&limit=50
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase();
  const year = url.searchParams.get("year");
  const order = url.searchParams.get("order") || "xp";
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);

  const where: any = {};
  if (year === "1" || year === "2") where.year = year;
  if (search) {
    where.OR = [
      { uid: { contains: search } },
      { name: { contains: search } },
      { username: { contains: search } },
    ];
  }
  const orderBy: any =
    order === "solved"
      ? [{ achievements: { _count: "desc" } }]
      : order === "streak"
      ? { currentStreak: "desc" }
      : order === "recent"
      ? { createdAt: "desc" }
      : { xp: "desc" };

  const users = await db.user.findMany({
    where,
    orderBy,
    take: limit,
    include: { avatar: true, _count: { select: { submissions: true, achievements: true, certificates: true } } },
  });
  // solved count distinct challenges
  const out: any[] = [];
  for (const u of users) {
    const solvedDistinct = await db.submission.findMany({
      where: { userId: u.id, passedAll: true },
      select: { challengeId: true },
      distinct: ["challengeId"],
    });
    out.push({
      id: u.id,
      uid: u.uid,
      name: u.name,
      year: u.year,
      batch: u.batch,
      avatar: u.avatar ? safeJson(u.avatar.config, {}) : {},
      xp: u.xp,
      level: u.level,
      levelName: u.levelName,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
      solvedCount: solvedDistinct.length,
      attempts: u._count.submissions,
      achievements: u._count.achievements,
      certificates: u._count.certificates,
      isBanned: u.isBanned,
      createdAt: u.createdAt,
    });
  }
  return ok({ participants: out });
}
