import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, fail, unauthorized, publicUser } from "@/lib/api";
import { computeLevelInfo } from "@/lib/progression";

// GET /api/profile?uid=... — full public profile
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  const targetUid = uid || session?.uid;
  if (!targetUid) return unauthorized("Not logged in");

  const user = await db.user.findUnique({
    where: { uid: targetUid },
    include: { avatar: true, achievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" } }, certificates: { orderBy: { issuedAt: "desc" } } },
  });
  if (!user) return fail("User not found", 404);

  const subs = await db.submission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { challenge: { select: { title: true, slug: true, difficulty: true, category: true, xpReward: true } } },
    take: 200,
  });
  const solvedSubs = subs.filter((s) => s.passedAll);
  const solvedChallenges = new Set(solvedSubs.map((s) => s.challengeId));
  const attempts = subs.length;
  const successRate = attempts === 0 ? 0 : (solvedChallenges.size / attempts) * 100;

  // activity timeline (logs)
  const logs = await db.activityLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // contribution calendar: count solves per date
  const solveDates = await db.activityLog.findMany({
    where: { userId: user.id, type: "solve" },
    select: { date: true },
  });
  const dateCount: Record<string, number> = {};
  for (const d of solveDates) if (d.date) dateCount[d.date] = (dateCount[d.date] || 0) + 1;

  const levelInfo = computeLevelInfo(user.xp);

  const data = {
    user: publicUser(user),
    levelInfo,
    stats: {
      solvedCount: solvedChallenges.size,
      attempts,
      successRate: Number(successRate.toFixed(1)),
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      xp: user.xp,
      level: user.level,
      levelName: user.levelName,
    },
    achievements: user.achievements.map((ua) => ({
      ...ua.achievement,
      unlockedAt: ua.unlockedAt,
    })),
    certificates: user.certificates,
    submissions: subs.slice(0, 30).map((s) => ({
      id: s.id,
      challengeId: s.challengeId,
      challengeTitle: s.challenge.title,
      challengeSlug: s.challenge.slug,
      difficulty: s.challenge.difficulty,
      category: s.challenge.category,
      language: s.language,
      status: s.status,
      passedAll: s.passedAll,
      attemptNumber: s.attemptNumber,
      execTimeMs: s.execTimeMs,
      xpAwarded: s.xpAwarded,
      createdAt: s.createdAt,
    })),
    timeline: logs,
    contributionCalendar: dateCount,
    isOwn: session?.userId === user.id,
  };
  return ok(data);
}

// PATCH /api/profile — update bio, username, featured badges, titles
export async function PATCH(req: NextRequest) {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  let body: { bio?: string; username?: string; featuredBadges?: string[] };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON");
  }
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return unauthorized();
  const data: any = {};
  if (body.bio !== undefined) data.bio = body.bio.slice(0, 500);
  if (body.username !== undefined) data.username = body.username.slice(0, 40) || null;
  if (body.featuredBadges !== undefined) {
    // validate that the user actually owns these achievements
    const owned = await db.userAchievement.findMany({
      where: { userId: user.id },
      select: { achievement: { select: { key: true } } },
    });
    const ownedKeys = new Set(owned.map((o) => o.achievement.key));
    const valid = body.featuredBadges.filter((k) => ownedKeys.has(k)).slice(0, 6);
    data.featuredBadges = JSON.stringify(valid);
  }
  const updated = await db.user.update({ where: { id: user.id }, data, include: { avatar: true } });
  return ok({ user: publicUser(updated) });
}
