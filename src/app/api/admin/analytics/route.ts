import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ok, unauthorized } from "@/lib/api";

// GET /api/admin/analytics — participation analytics comparing year1 vs year2
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const year1 = await db.user.count({ where: { year: "1" } });
  const year2 = await db.user.count({ where: { year: "2" } });

  const year1Subs = await db.submission.count({
    where: { user: { year: "1" } },
  });
  const year2Subs = await db.submission.count({
    where: { user: { year: "2" } },
  });
  const year1Accepted = await db.submission.count({
    where: { user: { year: "1" }, passedAll: true },
  });
  const year2Accepted = await db.submission.count({
    where: { user: { year: "2" }, passedAll: true },
  });

  // challenges solved per year (distinct user-challenge pairs)
  const y1SolvedRows = await db.submission.findMany({
    where: { user: { year: "1" }, passedAll: true },
    select: { challengeId: true, userId: true },
    distinct: ["challengeId", "userId"],
  });
  const y2SolvedRows = await db.submission.findMany({
    where: { user: { year: "2" }, passedAll: true },
    select: { challengeId: true, userId: true },
    distinct: ["challengeId", "userId"],
  });
  const y1DistinctChallenges = new Set(y1SolvedRows.map((r) => r.challengeId));
  const y2DistinctChallenges = new Set(y2SolvedRows.map((r) => r.challengeId));

  // challenge-wise performance: per challenge, how many y1 vs y2 solved
  const challenges = await db.challenge.findMany({
    where: { status: "published" },
    select: { id: true, title: true, slug: true, difficulty: true, category: true, xpReward: true },
  });
  const challengePerf: any[] = [];
  for (const c of challenges) {
    const y1Solved = await db.submission.count({
      where: { challengeId: c.id, passedAll: true, user: { year: "1" } },
    });
    const y2Solved = await db.submission.count({
      where: { challengeId: c.id, passedAll: true, user: { year: "2" } },
    });
    const y1Attempts = await db.submission.count({
      where: { challengeId: c.id, user: { year: "1" } },
    });
    const y2Attempts = await db.submission.count({
      where: { challengeId: c.id, user: { year: "2" } },
    });
    challengePerf.push({
      id: c.id,
      title: c.title,
      slug: c.slug,
      difficulty: c.difficulty,
      category: c.category,
      xpReward: c.xpReward,
      y1Solved, y2Solved, y1Attempts, y2Attempts,
    });
  }

  // participation rate
  const y1Active = await db.submission.findMany({
    where: { user: { year: "1" } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const y2Active = await db.submission.findMany({
    where: { user: { year: "2" } },
    select: { userId: true },
    distinct: ["userId"],
  });

  // submissions over time (last 14 days)
  const since = new Date(Date.now() - 14 * 86400000);
  const recentSubs = await db.submission.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, user: { select: { year: true } }, passedAll: true },
  });
  const seriesByDay: Record<string, { y1: number; y2: number; y1Accepted: number; y2Accepted: number }> = {};
  for (const s of recentSubs) {
    const day = s.createdAt.toISOString().slice(0, 10);
    if (!seriesByDay[day]) seriesByDay[day] = { y1: 0, y2: 0, y1Accepted: 0, y2Accepted: 0 };
    if (s.user.year === "1") {
      seriesByDay[day].y1++;
      if (s.passedAll) seriesByDay[day].y1Accepted++;
    } else {
      seriesByDay[day].y2++;
      if (s.passedAll) seriesByDay[day].y2Accepted++;
    }
  }

  return ok({
    participants: {
      year1,
      year2,
      total: year1 + year2,
      participationRate: {
        year1: year1 === 0 ? 0 : Number(((y1Active.length / year1) * 100).toFixed(1)),
        year2: year2 === 0 ? 0 : Number(((y2Active.length / year2) * 100).toFixed(1)),
      },
    },
    submissions: {
      year1: year1Subs,
      year2: year2Subs,
      accepted: { year1: year1Accepted, year2: year2Accepted },
      successRate: {
        year1: year1Subs === 0 ? 0 : Number(((year1Accepted / year1Subs) * 100).toFixed(1)),
        year2: year2Subs === 0 ? 0 : Number(((year2Accepted / year2Subs) * 100).toFixed(1)),
      },
    },
    solvedChallenges: {
      year1: y1DistinctChallenges.size,
      year2: y2DistinctChallenges.size,
    },
    challengePerformance: challengePerf,
    series: Object.entries(seriesByDay)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, v]) => ({ day, ...v })),
  });
}
