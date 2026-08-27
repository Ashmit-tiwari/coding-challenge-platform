import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ok, unauthorized } from "@/lib/api";

// GET /api/admin/dashboard — overview metrics
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const totalParticipants = await db.user.count();
  const year1 = await db.user.count({ where: { year: "1" } });
  const year2 = await db.user.count({ where: { year: "2" } });
  const totalChallenges = await db.challenge.count();
  const publishedChallenges = await db.challenge.count({ where: { status: "published" } });
  const totalSubmissions = await db.submission.count();
  const acceptedSubmissions = await db.submission.count({ where: { passedAll: true } });
  const unsuccessful = totalSubmissions - acceptedSubmissions;
  const totalXp = await db.user.aggregate({ _sum: { xp: true } });
  const activeStreaks = await db.user.count({ where: { currentStreak: { gte: 1 } } });
  const streakGte7 = await db.user.count({ where: { currentStreak: { gte: 7 } } });
  const streakGte30 = await db.user.count({ where: { currentStreak: { gte: 30 } } });
  const banned = await db.user.count({ where: { isBanned: true } });
  const pendingFlags = await db.plagiarismFlag.count({ where: { status: "pending" } });
  const confirmedFlags = await db.plagiarismFlag.count({ where: { status: "confirmed" } });
  const totalAchievements = await db.achievement.count();
  const unlockedAchievements = await db.userAchievement.count();
  const totalCertificates = await db.certificate.count();

  // active participants (submitted within 7 days)
  const since7 = new Date(Date.now() - 7 * 86400000);
  const activeParticipants = await db.submission.findMany({
    where: { createdAt: { gte: since7 } },
    select: { userId: true },
    distinct: ["userId"],
  });
  // avg attempts per solved
  const solvedSubs = await db.submission.findMany({ where: { passedAll: true }, select: { userId: true, challengeId: true } });
  const distinctSolved = new Set(solvedSubs.map((s) => `${s.userId}:${s.challengeId}`));
  const avgAttempts = distinctSolved.size === 0 ? 0 : totalSubmissions / distinctSolved.size;

  // recent submissions (last 10)
  const recentSubs = await db.submission.findMany({
    take: 12,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { uid: true, name: true, year: true } },
      challenge: { select: { title: true, slug: true } },
    },
  });

  return ok({
    totals: {
      totalParticipants,
      activeParticipants: activeParticipants.length,
      year1,
      year2,
      totalChallenges,
      publishedChallenges,
      totalSubmissions,
      acceptedSubmissions,
      unsuccessful,
      avgAttemptsPerSolved: Number(avgAttempts.toFixed(2)),
      totalXp: totalXp._sum.xp || 0,
      activeStreaks,
      streakGte7,
      streakGte30,
      banned,
      pendingFlags,
      confirmedFlags,
      totalAchievements,
      unlockedAchievements,
      totalCertificates,
    },
    recentSubmissions: recentSubs.map((s) => ({
      id: s.id,
      user: s.user,
      challenge: s.challenge,
      language: s.language,
      status: s.status,
      passedAll: s.passedAll,
      attemptNumber: s.attemptNumber,
      createdAt: s.createdAt,
    })),
  });
}
