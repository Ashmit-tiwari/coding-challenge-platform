import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, publicUser, safeJson } from "@/lib/api";

// GET /api/leaderboard — Fast Batch Query
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") || "overall") as "overall" | "year1" | "year2";
  const period = url.searchParams.get("period") || "all";
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

  const where: any = { isBanned: false };
  if (scope === "year1") where.year = "1";
  if (scope === "year2") where.year = "2";

  if (period === "weekly" || period === "monthly") {
    const since = new Date(Date.now() - (period === "weekly" ? 7 : 30) * 86400000);
    where.submissions = { some: { createdAt: { gte: since } } };
  }

  const users = await db.user.findMany({
    where,
    include: { avatar: true, achievements: { include: { achievement: { select: { key: true, icon: true, rarity: true, name: true } } }, take: 12 } },
    orderBy: [{ xp: "desc" }, { currentStreak: "desc" }, { createdAt: "asc" }],
    take: limit,
  });

  const userIds = users.map((u) => u.id);

  // Single batch query for distinct solves across all users
  const userSubs = await db.submission.findMany({
    where: { userId: { in: userIds }, passedAll: true },
    select: { userId: true, challengeId: true },
  });

  const userSolvedSets: Record<string, Set<string>> = {};
  for (const s of userSubs) {
    if (!userSolvedSets[s.userId]) userSolvedSets[s.userId] = new Set();
    userSolvedSets[s.userId].add(s.challengeId);
  }

  const solvedMap: Record<string, number> = {};
  for (const u of users) {
    solvedMap[u.id] = userSolvedSets[u.id]?.size || 0;
  }

  const ranked = users.map((u, i) => {
    const achievementBadges = u.achievements.slice(0, 4).map((ua) => ua.achievement);
    return {
      rank: i + 1,
      id: u.id,
      uid: u.uid,
      name: u.name,
      year: u.year,
      avatar: u.avatar ? JSON.parse(u.avatar.config) : {},
      xp: u.xp,
      level: u.level,
      levelName: u.levelName,
      solvedCount: solvedMap[u.id] || 0,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
      badges: achievementBadges,
      isCurrentUser: session?.userId === u.id,
      trend: "same" as const,
    };
  });

  let currentUserRank = null;
  if (session) {
    const idx = ranked.findIndex((r) => r.id === session.userId);
    if (idx !== -1) {
      currentUserRank = ranked[idx];
    } else {
      const me = await db.user.findUnique({
        where: { id: session.userId },
        include: { avatar: true },
      });
      if (me) {
        const higherCount = await db.user.count({
          where: { isBanned: false, xp: { gt: me.xp } },
        });
        const mySubs = await db.submission.findMany({
          where: { userId: me.id, passedAll: true },
          select: { challengeId: true },
          distinct: ["challengeId"],
        });
        currentUserRank = {
          rank: higherCount + 1,
          id: me.id,
          uid: me.uid,
          name: me.name,
          year: me.year,
          avatar: me.avatar ? JSON.parse(me.avatar.config) : {},
          xp: me.xp,
          level: me.level,
          levelName: me.levelName,
          solvedCount: mySubs.length,
          currentStreak: me.currentStreak,
          longestStreak: me.longestStreak,
          badges: [],
          isCurrentUser: true,
          trend: "same" as const,
        };
      }
    }
  }

  return ok({
    leaderboard: ranked,
    currentUser: currentUserRank,
    meta: {
      scope,
      period,
      totalCount: users.length,
      lastUpdated: new Date().toISOString(),
    },
  });
}
