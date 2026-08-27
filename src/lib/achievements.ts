import { db } from "@/lib/db";
import { Achievement } from "@prisma/client";

// Achievement definitions are seeded into the DB. The `condition` field is JSON
// describing how to evaluate. The evaluator here computes the relevant metric
// from authoritative backend data and decides unlock.

export interface AchievementCondition {
  metric:
    | "solved_count"
    | "first_solve"
    | "first_attempt_solve"
    | "perfect_submission"
    | "zero_warnings_solve"
    | "streak_days"
    | "longest_streak_days"
    | "category_complete"
    | "tier_reached"
    | "speed_ms"
    | "submission_count"
    | "difficulty_solved"
    | "first_code_right"
    | "debugging_master"
    | "test_crusher"
    | "consistency_king";
  op: "gte" | "eq" | "lte" | "is";
  value: number | string;
  // for category_complete: which category
  category?: string;
  // for tier_reached: which tier name
  tier?: string;
  // difficulty_solved: how many of a given difficulty
  difficulty?: string;
}

export interface EvalContext {
  userId: string;
  solvedCount: number;
  firstAttemptSolves: number;
  perfectSubmissions: number;
  zeroWarningSolves: number;
  currentStreak: number;
  longestStreak: number;
  submissionCount: number;
  tier: string;
  level: number;
  fastestSolveMs: number;
  categoryCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  hasFirstSolve: boolean;
  hasFirstCodeRight: boolean;
  debugMasterCount: number; // solved after a runtime/compile error
  testCrusherCount: number; // solved with all tests first try
  consistencyWeeks: number; // consecutive weeks active
}

export async function buildEvalContext(userId: string): Promise<EvalContext> {
  const user = await db.user.findUnique({ where: { id: userId } });
  const submissions = await db.submission.findMany({ where: { userId } });
  const solvedSubs = submissions.filter((s) => s.passedAll);
  const solvedChallenges = new Set(solvedSubs.map((s) => s.challengeId));
  const firstAttemptSolves = solvedSubs.filter((s) => s.firstAttempt).length;
  const perfectSubmissions = solvedSubs.filter((s) => s.totalTests > 0 && s.passedCount === s.totalTests).length;

  // zero warnings = solved with no compile/runtime errors across attempts for that challenge
  let zeroWarningSolves = 0;
  for (const chId of solvedChallenges) {
    const chSubs = submissions.filter((s) => s.challengeId === chId);
    const hadError = chSubs.some(
      (s) =>
        s.status === "Compilation Error" || s.status === "Runtime Error" || s.status === "Internal Error",
    );
    if (!hadError) zeroWarningSolves++;
  }

  const categoryCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};
  const challengeIds = Array.from(solvedChallenges);
  if (challengeIds.length) {
    const challenges = await db.challenge.findMany({
      where: { id: { in: challengeIds } },
      select: { id: true, category: true, difficulty: true },
    });
    for (const c of challenges) {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
      difficultyCounts[c.difficulty] = (difficultyCounts[c.difficulty] || 0) + 1;
    }
  }

  const fastestSolveMs = solvedSubs.reduce((m, s) => Math.min(m, s.execTimeMs), Infinity);

  // debugMaster: solved a challenge where earlier attempts had runtime/compile errors
  let debugMasterCount = 0;
  for (const chId of solvedChallenges) {
    const chSubs = submissions.filter((s) => s.challengeId === chId);
    const hadError = chSubs.some((s) => s.status === "Compilation Error" || s.status === "Runtime Error");
    if (hadError) debugMasterCount++;
  }

  // testCrusher: solved where final submission passed all tests on first attempt for that challenge
  let testCrusherCount = 0;
  for (const chId of solvedChallenges) {
    const chSubs = submissions
      .filter((s) => s.challengeId === chId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const first = chSubs[0];
    if (first && first.passedAll && first.passedCount === first.totalTests) testCrusherCount++;
  }

  // consistency weeks: count distinct ISO weeks containing a solve
  const weekSet = new Set<string>();
  for (const s of solvedSubs) {
    const d = s.createdAt;
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    weekSet.add(`${d.getFullYear()}-${week}`);
  }
  // consecutive weeks ending at the latest solve
  const sortedWeeks = Array.from(weekSet).sort();
  let consistencyWeeks = sortedWeeks.length ? 1 : 0;
  for (let i = sortedWeeks.length - 1; i > 0; i--) {
    const [py, pw] = sortedWeeks[i].split("-").map(Number);
    const [ny, nw] = sortedWeeks[i - 1].split("-").map(Number);
    const diff = (py - ny) * 52 + (pw - nw);
    if (diff === 1) consistencyWeeks++;
    else break;
  }

  return {
    userId,
    solvedCount: solvedChallenges.size,
    firstAttemptSolves,
    perfectSubmissions,
    zeroWarningSolves,
    currentStreak: user?.currentStreak || 0,
    longestStreak: user?.longestStreak || 0,
    submissionCount: submissions.length,
    tier: user?.levelName || "Beginner",
    level: user?.level || 1,
    fastestSolveMs: fastestSolveMs === Infinity ? 0 : fastestSolveMs,
    categoryCounts,
    difficultyCounts,
    hasFirstSolve: solvedChallenges.size > 0,
    hasFirstCodeRight: submissions.length > 0,
    debugMasterCount,
    testCrusherCount,
    consistencyWeeks,
  };
}

export function evaluateCondition(cond: AchievementCondition, ctx: EvalContext): boolean {
  const v = cond.value;
  switch (cond.metric) {
    case "solved_count":
      return ctx.solvedCount >= Number(v);
    case "first_solve":
      return ctx.hasFirstSolve;
    case "first_attempt_solve":
      return ctx.firstAttemptSolves >= Number(v);
    case "perfect_submission":
      return ctx.perfectSubmissions >= Number(v);
    case "zero_warnings_solve":
      return ctx.zeroWarningSolves >= Number(v);
    case "streak_days":
      return ctx.currentStreak >= Number(v);
    case "longest_streak_days":
      return ctx.longestStreak >= Number(v);
    case "tier_reached": {
      const order = ["Beginner", "Intermediate", "Advanced", "Pro"];
      const req = order.indexOf(String(v));
      const cur = order.indexOf(ctx.tier);
      return cur >= 0 && req >= 0 && cur >= req;
    }
    case "speed_ms":
      return ctx.fastestSolveMs > 0 && ctx.fastestSolveMs <= Number(v);
    case "submission_count":
      return ctx.submissionCount >= Number(v);
    case "category_complete": {
      // value = required count in category
      const n = ctx.categoryCounts[cond.category || ""] || 0;
      return n >= Number(v);
    }
    case "difficulty_solved":
      return (ctx.difficultyCounts[cond.difficulty || ""] || 0) >= Number(v);
    case "first_code_right":
      return ctx.hasFirstCodeRight;
    case "debugging_master":
      return ctx.debugMasterCount >= Number(v);
    case "test_crusher":
      return ctx.testCrusherCount >= Number(v);
    case "consistency_king":
      return ctx.consistencyWeeks >= Number(v);
    default:
      return false;
  }
}

// Run all achievement checks for a user. Awards idempotently. Returns newly unlocked.
export async function evaluateAchievements(userId: string): Promise<Achievement[]> {
  const ctx = await buildEvalContext(userId);
  const all = await db.achievement.findMany();
  const existing = await db.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const existingSet = new Set(existing.map((e) => e.achievementId));
  const unlocked: Achievement[] = [];
  for (const a of all) {
    if (existingSet.has(a.id)) continue;
    let cond: AchievementCondition;
    try {
      cond = JSON.parse(a.condition) as AchievementCondition;
    } catch {
      continue;
    }
    if (evaluateCondition(cond, ctx)) {
      await db.userAchievement
        .create({
          data: {
            userId,
            achievementId: a.id,
          },
        })
        .catch(() => {
          // already exists (race) — ignore
        });
      unlocked.push(a);
      // award XP
      if (a.xpReward > 0) {
        await db.xpTransaction.create({
          data: {
            userId,
            amount: a.xpReward,
            reason: "achievement",
            refId: a.id,
          },
        });
        await db.user.update({
          where: { id: userId },
          data: { xp: { increment: a.xpReward } },
        });
      }
      // notification
      await db.notification.create({
        data: {
          userId,
          type: "achievement",
          title: "Achievement Unlocked!",
          message: `You earned "${a.name}". ${a.description}`,
          link: "/achievements",
        },
      });
      // activity log
      await db.activityLog.create({
        data: {
          userId,
          type: "achievement",
          description: `Unlocked achievement: ${a.name}`,
          refId: a.id,
          date: new Date().toISOString().slice(0, 10),
        },
      });
    }
  }
  return unlocked;
}

// Check & issue certificates for tier completion
export async function evaluateCertificates(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const levelName = user.levelName;
  const tierLevels: Record<string, number> = {
    Beginner: 2,
    Intermediate: 4,
    Advanced: 6,
    Pro: 9,
  };
  const result = [];
  for (const [tier, reqLevel] of Object.entries(tierLevels)) {
    if (user.level >= reqLevel || (tier === "Beginner" && user.level >= 1)) {
      // Beginner certificate requires at least 3 solves, Intermediate 8, Advanced 15, Pro 25
      const solveReq = tier === "Beginner" ? 3 : tier === "Intermediate" ? 8 : tier === "Advanced" ? 15 : 25;
      const solvedCount = await db.submission.count({
        where: { userId, passedAll: true },
      });
      // distinct challenges
      const distinctCh = await db.submission.findMany({
        where: { userId, passedAll: true },
        select: { challengeId: true },
        distinct: ["challengeId"],
      });
      if (distinctCh.length >= solveReq) {
        const existing = await db.certificate.findUnique({
          where: { userId_level: { userId, level: tier } },
        });
        if (!existing) {
          const certId = `WCC-${tier.slice(0, 3).toUpperCase()}-${user.uid}-${Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()}`;
          const cert = await db.certificate.create({
            data: {
              certId,
              userId,
              level: tier,
              tierLevel: reqLevel,
              studentName: user.name,
              studentUid: user.uid,
              year: user.year,
            },
          });
          result.push(cert);
          await db.notification.create({
            data: {
              userId,
              type: "certificate",
              title: `${tier} Certificate Issued`,
              message: `Congratulations! Your ${tier} completion certificate is ready.`,
              link: "/certificates",
            },
          });
          await db.activityLog.create({
            data: {
              userId,
              type: "certificate",
              description: `Earned ${tier} certificate`,
              refId: cert.id,
              date: new Date().toISOString().slice(0, 10),
            },
          });
        }
      }
    }
  }
  return result;
}
