import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";
import { evaluateAchievements, evaluateCertificates, getUserMetrics } from "@/lib/achievements";

// GET /api/achievements?uid=... — all badges, certificates & progress for student
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  const targetUid = uid || session?.uid;
  if (!targetUid) return unauthorized("Not logged in");

  const user = await db.user.findUnique({ where: { uid: targetUid } });
  if (!user) return ok({ badges: [], certificates: [], stats: { totalBadges: 0, unlockedBadges: 0, totalCertificates: 0 } });

  // If this is the logged-in user, run a quick auto-evaluation to ensure up-to-date unlocks
  if (session?.userId === user.id) {
    await evaluateAchievements(user.id);
    await evaluateCertificates(user.id);
  }

  // 1. Fetch user metrics
  const metrics = await getUserMetrics(user.id);

  // 2. Fetch all active badges
  const allBadges = await db.achievement.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  // 3. Fetch user's unlocked badges
  const unlockedRows = await db.userAchievement.findMany({
    where: { userId: user.id },
  });
  const unlockedMap = new Map(unlockedRows.map((u) => [u.achievementId, u]));

  // Compute progress for each badge
  const badges = allBadges.map((b) => {
    const unlock = unlockedMap.get(b.id);
    const reqType = b.requirementType || "xp_threshold";
    const reqVal = b.requirementValue || 0;

    let current = 0;
    if (metrics) {
      switch (reqType) {
        case "xp_threshold": current = metrics.xp; break;
        case "challenges_count": current = metrics.solvedCount; break;
        case "accepted_submissions": current = metrics.acceptedSubmissions; break;
        case "submission_count": current = metrics.totalSubmissions; break;
        case "weekly_winner": current = metrics.weeklyWins; break;
        case "streak": current = Math.max(metrics.currentStreak, metrics.longestStreak); break;
        case "specific_challenge": current = (b.specificChallengeId && metrics.solvedChallengeIds.has(b.specificChallengeId)) ? 1 : 0; break;
        case "manual": current = unlock ? 1 : 0; break;
        default: current = 0;
      }
    }

    const needed = reqVal || 1;
    const progressPct = unlock ? 100 : Math.min(Math.round((current / needed) * 100), 99);
    const remaining = Math.max(needed - current, 0);

    return {
      id: b.id,
      key: b.key,
      name: b.name,
      description: b.description,
      category: b.category,
      rarity: b.rarity,
      icon: b.icon,
      requirementType: b.requirementType,
      requirementValue: b.requirementValue,
      xpReward: b.xpReward,
      unlocked: !!unlock,
      unlockedAt: unlock?.unlockedAt ? unlock.unlockedAt.toISOString() : null,
      awardType: unlock?.awardType || "automatic",
      reason: unlock?.reason || null,
      progress: {
        current,
        needed,
        progressPct,
        remaining,
      },
    };
  });

  // 4. Fetch user's issued certificates
  const issuedCerts = await db.issuedCertificate.findMany({
    where: { userId: user.id },
    orderBy: { issueDate: "desc" },
    include: {
      template: {
        select: { category: true, badgeColor: true, issuerName: true },
      },
    },
  });

  const certificates = issuedCerts.map((c) => ({
    id: c.id,
    verificationId: c.verificationId,
    title: c.title,
    description: c.description,
    recipientName: c.recipientName,
    recipientUid: c.recipientUid,
    recipientYear: c.recipientYear,
    issueDate: c.issueDate.toISOString(),
    status: c.status,
    category: c.template?.category || "Milestone",
    badgeColor: c.template?.badgeColor || "#eab308",
    issuerName: c.template?.issuerName || "A-I-M-L Club",
    adminNote: c.adminNote,
  }));

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return ok({
    user: {
      name: user.name,
      uid: user.uid,
      year: user.year,
      xp: user.xp,
      level: user.level,
      levelName: user.levelName,
    },
    badges,
    certificates,
    stats: {
      totalBadges: badges.length,
      unlockedBadges: unlockedCount,
      totalCertificates: certificates.length,
    },
  });
}

// POST /api/achievements — re-evaluate unlocks on demand
export async function POST() {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");

  const newlyUnlockedBadges = await evaluateAchievements(session.userId);
  const newlyIssuedCerts = await evaluateCertificates(session.userId);

  return ok({
    newlyUnlockedBadges,
    newlyIssuedCerts,
  });
}
