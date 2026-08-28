import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, publicUser, safeJson } from "@/lib/api";

// GET /api/leaderboard?scope=overall|year1|year2&period=all|weekly|monthly
// Scope:
//   overall — all students
//   year1   — first-year students (batch 2026)
//   year2   — second-year students (batch 2025)
// Period: all-time / weekly (last 7 days) / monthly (last 30 days)
// Returns ranked list with rank, avatar, name, year, xp, solved, streak, achievement icons, movement.
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") || "overall") as "overall" | "year1" | "year2";
  const period = url.searchParams.get("period") || "all";
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

  const where: any = { isBanned: false };
  if (scope === "year1") where.year = "1";
  if (scope === "year2") where.year = "2";

  // period filter only affects "activity-based" XP — for simplicity we rank by total XP,
  // but expose weekly/monthly subs for the client. The leaderboard itself uses XP as primary.
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

  // solved count per user via a single groupBy query
  const solvedAgg = await db.submission.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, passedAll: true },
    _count: { challengeId: true },
  });
  const solvedMap: Record<string, number> = {};
  // distinct challenges solved
  for (const u of users) {
    const distinctChs = await db.submission.findMany({
      where: { userId: u.id, passedAll: true },
      select: { challengeId: true },
      distinct: ["challengeId"],
    });
    solvedMap[u.id] = distinctChs.length;
  }

  const ranked = users.map((u, i) => {
    const achievementBadges = u.achievements.slice(0, 4).map((ua) => ua.achievement);
    return {
      rank: i + 1,
      id: u.id,
      uid: u.uid,
      name: u.name,
      year: u.year,
      avatar: u.avatar ? safeJson(u.avatar.config, {}) : {},
      xp: u.xp,
      level: u.level,
      levelName: u.levelName,
      solvedCount: solvedMap[u.id] || 0,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
      achievements: achievementBadges,
      isMe: session?.userId === u.id,
    };
  });

  // Movement: compute previous-rank snapshot for "me" if logged in.
  // For simplicity, derive movement by comparing to a 7-day-ago snapshot if available.
  let myMovement: "up" | "down" | "same" | "new" = "same";
  if (session) {
    const myEntry = ranked.find((r) => r.id === session.userId);
    if (myEntry) {
      // approximate movement: compare current rank to rank if we excluded last-7-day XP.
      // We'll keep it simple and mark "new" if user wasn't in a saved snapshot.
      const mySnap = await db.leaderboardSnapshot.findFirst({
        where: { userId: session.userId, scope, period: "all" },
        orderBy: { capturedAt: "desc" },
      });
      if (!mySnap) myMovement = "new";
      else if (mySnap.rank > myEntry.rank) myMovement = "up";
      else if (mySnap.rank < myEntry.rank) myMovement = "down";
      else myMovement = "same";
    }
  }

  // top weekly winners (hall of fame) — admin declared winners
  const recentWinners = await db.weeklyWinner.findMany({
    take: 36,
    orderBy: [{ weekLabel: "desc" }, { year: "asc" }, { rank: "asc" }],
    include: {
      user: { include: { avatar: true } },
      challenge: { select: { title: true, slug: true } },
    },
  });
  const hallOfFame = recentWinners.map((w) => ({
    id: w.id,
    weekLabel: w.weekLabel,
    year: w.year,
    rank: w.rank,
    title: w.title,
    adminNote: w.adminNote,
    createdAt: w.createdAt,
    challenge: w.challenge,
    user: {
      id: w.user.id,
      uid: w.user.uid,
      name: w.user.name,
      year: w.user.year,
      avatar: w.user.avatar ? safeJson(w.user.avatar.config, {}) : {},
    },
  }));

  return ok({
    leaderboard: ranked,
    scope,
    period,
    myMovement,
    hallOfFame,
  });
}
