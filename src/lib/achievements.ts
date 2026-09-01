import { db } from "@/lib/db";
import { Achievement, CertificateTemplate, IssuedCertificate, UserAchievement } from "@prisma/client";
import { safeJson } from "@/lib/api";

export interface TriggerOptions {
  submissionId?: string;
  passedAll?: boolean;
  language?: string;
  firstAttempt?: boolean;
  hadSolvedBefore?: boolean;
  isRecursion?: boolean;
}

export function generateVerificationId(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CERT-AIML-${year}-${randomPart}`;
}

// User metric calculation
export interface UserMetrics {
  userId: string;
  xp: number;
  solvedCount: number;
  acceptedSubmissions: number;
  totalSubmissions: number;
  currentStreak: number;
  longestStreak: number;
  weeklyWins: number;
  solvedChallengeIds: Set<string>;
}

export async function getUserMetrics(userId: string): Promise<UserMetrics | null> {
  const [user, submissions, weeklyWins] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, xp: true, currentStreak: true, longestStreak: true },
    }),
    db.submission.findMany({
      where: { userId },
      select: { challengeId: true, passedAll: true, status: true },
    }),
    db.weeklyWinner.count({ where: { userId } }),
  ]);

  if (!user) return null;

  const solvedChallengeIds = new Set<string>();
  let acceptedSubmissions = 0;

  for (const s of submissions) {
    if (s.passedAll) {
      solvedChallengeIds.add(s.challengeId);
      acceptedSubmissions++;
    } else if (s.status === "Accepted") {
      acceptedSubmissions++;
    }
  }

  return {
    userId: user.id,
    xp: user.xp,
    solvedCount: solvedChallengeIds.size,
    acceptedSubmissions,
    totalSubmissions: submissions.length,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    weeklyWins,
    solvedChallengeIds,
  };
}

// ---------------------------------------------------------------------------
// 1. Evaluate & Auto-Unlock Badges & Achievements
// ---------------------------------------------------------------------------
export async function evaluateAchievements(
  userId: string,
  opts?: TriggerOptions
): Promise<Achievement[]> {
  const metrics = await getUserMetrics(userId);
  if (!metrics) return [];

  // 1. Fetch all active achievements from DB
  const allAchievements = await db.achievement.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  // 2. Fetch user's existing unlocked achievements
  const existingUnlocks = await db.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const unlockedIds = new Set(existingUnlocks.map((u) => u.achievementId));

  const newlyUnlocked: Achievement[] = [];
  let totalBonusXp = 0;

  for (const ach of allAchievements) {
    if (unlockedIds.has(ach.id)) continue;

    let isEligible = false;
    const reqType = ach.requirementType || "xp_threshold";
    const reqVal = ach.requirementValue || 0;

    switch (reqType) {
      case "xp_threshold":
        isEligible = metrics.xp >= reqVal;
        break;

      case "challenges_count":
        isEligible = metrics.solvedCount >= reqVal;
        break;

      case "accepted_submissions":
        isEligible = metrics.acceptedSubmissions >= reqVal;
        break;

      case "submission_count":
        isEligible = metrics.totalSubmissions >= reqVal;
        break;

      case "weekly_winner":
        isEligible = metrics.weeklyWins >= (reqVal || 1);
        break;

      case "streak":
        isEligible = metrics.currentStreak >= reqVal || metrics.longestStreak >= reqVal;
        break;

      case "specific_challenge":
        isEligible = ach.specificChallengeId ? metrics.solvedChallengeIds.has(ach.specificChallengeId) : false;
        break;

      case "manual":
        isEligible = false; // manual only
        break;

      default:
        // Optional legacy condition parse
        if (ach.condition) {
          try {
            const cond = JSON.parse(ach.condition);
            if (cond.metric === "solved_count") isEligible = metrics.solvedCount >= Number(cond.value);
            else if (cond.metric === "streak_days") isEligible = metrics.currentStreak >= Number(cond.value);
            else if (cond.metric === "submission_count") isEligible = metrics.totalSubmissions >= Number(cond.value);
          } catch {}
        }
    }

    if (isEligible) {
      try {
        await db.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
            awardType: "automatic",
          },
        });
        unlockedIds.add(ach.id);
        newlyUnlocked.push(ach);

        if (ach.xpReward > 0) {
          totalBonusXp += ach.xpReward;
        }

        // Send celebration notification
        await db.notification.create({
          data: {
            userId,
            type: "achievement",
            title: `🏆 Badge Unlocked: ${ach.name}!`,
            message: ach.description || `Congratulations! You unlocked the ${ach.name} badge.`,
            link: "/achievements",
          },
        });
      } catch (err: any) {
        // Unique constraint hit on concurrent run — safe to ignore
      }
    }
  }

  // Idempotently award achievement XP bonuses (preventing recursive loops)
  if (totalBonusXp > 0 && !opts?.isRecursion) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { xp: true } });
    if (user) {
      const newXp = user.xp + totalBonusXp;
      await db.user.update({
        where: { id: userId },
        data: { xp: newXp },
      });
      await db.xpTransaction.create({
        data: {
          userId,
          amount: totalBonusXp,
          reason: "milestone",
          refId: "achievement_reward",
        },
      });
      // Re-evaluate in recursion-safe mode if XP changed
      await evaluateAchievements(userId, { ...opts, isRecursion: true });
    }
  }

  return newlyUnlocked;
}

// ---------------------------------------------------------------------------
// 2. Evaluate & Auto-Issue Certificates
// ---------------------------------------------------------------------------
export async function evaluateCertificates(
  userId: string
): Promise<IssuedCertificate[]> {
  const metrics = await getUserMetrics(userId);
  if (!metrics) return [];

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, uid: true, year: true, xp: true },
  });
  if (!user) return [];

  // Fetch all active automatic certificate templates
  const templates = await db.certificateTemplate.findMany({
    where: { isActive: true, isAutomatic: true },
  });

  const existingIssued = await db.issuedCertificate.findMany({
    where: { userId },
    select: { templateId: true },
  });
  const issuedTemplateIds = new Set(existingIssued.map((i) => i.templateId));

  const newlyIssued: IssuedCertificate[] = [];

  for (const t of templates) {
    if (issuedTemplateIds.has(t.id)) continue;

    let isEligible = false;
    const reqType = t.requirementType || "xp_threshold";
    const reqVal = t.requirementValue || 0;

    switch (reqType) {
      case "xp_threshold":
        isEligible = metrics.xp >= reqVal;
        break;

      case "challenges_count":
        isEligible = metrics.solvedCount >= reqVal;
        break;

      case "weekly_winner":
        isEligible = metrics.weeklyWins >= (reqVal || 1);
        break;

      case "manual":
        isEligible = false;
        break;
    }

    if (isEligible) {
      try {
        let verificationId = generateVerificationId();
        // Check collision just in case
        const existing = await db.issuedCertificate.findUnique({ where: { verificationId } });
        if (existing) verificationId = generateVerificationId();

        const cert = await db.issuedCertificate.create({
          data: {
            verificationId,
            templateId: t.id,
            userId: user.id,
            title: t.name,
            description: t.description,
            recipientName: user.name,
            recipientUid: user.uid,
            recipientYear: user.year || "1",
            status: "VALID",
          },
        });

        issuedTemplateIds.add(t.id);
        newlyIssued.push(cert);

        // Send celebration notification
        await db.notification.create({
          data: {
            userId: user.id,
            type: "certificate",
            title: `🎓 Certificate Issued: ${t.name}!`,
            message: `Congratulations, ${user.name}! You have earned the "${t.name}" Certificate.`,
            link: "/achievements",
          },
        });
      } catch (err) {
        // Unique constraint — safe to ignore
      }
    }
  }

  return newlyIssued;
}
