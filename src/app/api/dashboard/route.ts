import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";
import { computeLevelInfo } from "@/lib/progression";

// GET /api/dashboard — student dashboard aggregate
export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { avatar: true },
  });
  if (!user) return unauthorized("User not found");

  const subs = await db.submission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { challenge: { select: { id: true, title: true, slug: true, difficulty: true, category: true, xpReward: true } } },
  });
  const solvedSubs = subs.filter((s) => s.passedAll);
  const solvedChallenges = new Set(solvedSubs.map((s) => s.challengeId));
  const successRate = subs.length === 0 ? 0 : (solvedChallenges.size / subs.length) * 100;

  // weekly challenge
  const weekly = await db.challenge.findFirst({
    where: { isWeekly: true, status: "published" },
    orderBy: { weekStartsAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  let weeklyUserState = null;
  if (weekly) {
    const ws = subs.filter((s) => s.challengeId === weekly.id);
    weeklyUserState = {
      attempted: ws.length > 0,
      solved: ws.some((s) => s.passedAll),
      attempts: ws.length,
    };
  }

  // contribution calendar (last 365 days)
  const solveLogs = await db.activityLog.findMany({
    where: { userId: user.id, type: "solve" },
    select: { date: true },
  });
  const dateCount: Record<string, number> = {};
  for (const l of solveLogs) if (l.date) dateCount[l.date] = (dateCount[l.date] || 0) + 1;

  // recent activity
  const recentLogs = await db.activityLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  // recent achievements
  const recentAchievements = await db.userAchievement.findMany({
    where: { userId: user.id },
    include: { achievement: true },
    orderBy: { unlockedAt: "desc" },
    take: 6,
  });

  const levelInfo = computeLevelInfo(user.xp);

  return ok({
    user: {
      id: user.id,
      uid: user.uid,
      name: user.name,
      year: user.year,
      avatar: user.avatar ? JSON.parse(user.avatar.config) : {},
      xp: user.xp,
      level: user.level,
      levelName: user.levelName,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
    },
    levelInfo,
    stats: {
      solvedCount: solvedChallenges.size,
      attempts: subs.length,
      successRate: Number(successRate.toFixed(1)),
      totalXp: user.xp,
      achievementsUnlocked: recentAchievements.length,
    },
    weekly: weekly
      ? {
          id: weekly.id,
          slug: weekly.slug,
          title: weekly.title,
          difficulty: weekly.difficulty,
          category: weekly.category,
          xpReward: weekly.xpReward,
          weekLabel: weekly.weekLabel,
          weekStartsAt: weekly.weekStartsAt,
          weekEndsAt: weekly.weekEndsAt,
          participationCount: weekly._count.submissions,
          userState: weeklyUserState,
        }
      : null,
    contributionCalendar: dateCount,
    recentActivity: recentLogs,
    recentAchievements: recentAchievements.map((ua) => ({ ...ua.achievement, unlockedAt: ua.unlockedAt })),
    recentSubmissions: subs.slice(0, 8).map((s) => ({
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
      xpAwarded: s.xpAwarded,
      createdAt: s.createdAt,
    })),
  });
}
