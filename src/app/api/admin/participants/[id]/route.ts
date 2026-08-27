import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, unauthorized, notFound, safeJson } from "@/lib/api";
import { computeLevelInfo } from "@/lib/progression";

// GET /api/admin/participants/[id] — detailed admin view of a student
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const { id } = await ctx.params;
  const user = await db.user.findUnique({
    where: { id },
    include: { avatar: true, achievements: { include: { achievement: true } }, certificates: true },
  });
  if (!user) return notFound("Participant not found");
  const subs = await db.submission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { challenge: { select: { id: true, title: true, slug: true, difficulty: true, category: true, xpReward: true } } },
  });
  const solvedSubs = subs.filter((s) => s.passedAll);
  const solvedChallenges = new Set(solvedSubs.map((s) => s.challengeId));
  const logs = await db.activityLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const levelInfo = computeLevelInfo(user.xp);
  return ok({
    user: {
      id: user.id,
      uid: user.uid,
      name: user.name,
      year: user.year,
      batch: user.batch,
      avatar: user.avatar ? safeJson(user.avatar.config, {}) : {},
      xp: user.xp,
      level: user.level,
      levelName: user.levelName,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      bio: user.bio,
      username: user.username,
      featuredBadges: safeJson(user.featuredBadges, []),
      titles: safeJson(user.titles, []),
    },
    levelInfo,
    stats: {
      solvedCount: solvedChallenges.size,
      attempts: subs.length,
      successRate: subs.length === 0 ? 0 : Number(((solvedChallenges.size / subs.length) * 100).toFixed(1)),
    },
    achievements: user.achievements.map((ua) => ({ ...ua.achievement, unlockedAt: ua.unlockedAt })),
    certificates: user.certificates,
    submissions: subs.slice(0, 30),
    activity: logs,
  });
}

// PATCH /api/admin/participants/[id] — ban/unban
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const { id } = await ctx.params;
  let body: { isBanned?: boolean; adjustXp?: number; reason?: string };
  try { body = await req.json(); } catch { return ok({ ok: false }); }
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return notFound("Participant not found");
  const data: any = {};
  if (body.isBanned !== undefined) data.isBanned = body.isBanned;
  const updated = await db.user.update({ where: { id }, data });
  if (body.adjustXp && Number(body.adjustXp) !== 0) {
    await db.xpTransaction.create({
      data: { userId: id, amount: Number(body.adjustXp), reason: "admin_adjust", refId: admin.id },
    });
    await db.user.update({ where: { id }, data: { xp: { increment: Number(body.adjustXp) } } });
  }
  await writeAudit(admin.id, body.isBanned === true ? "user_ban" : body.isBanned === false ? "user_unban" : "user_xp_adjust", id, { isBanned: body.isBanned, adjustXp: body.adjustXp, reason: body.reason });
  return ok({ user: updated });
}
