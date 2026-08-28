import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, fail, unauthorized, forbidden, notFound, publicChallenge, safeJson } from "@/lib/api";
import { evaluateAchievements, evaluateCertificates } from "@/lib/achievements";
import { recomputeStreak } from "@/lib/progression";
import { fingerprint, compareCode, SIMILARITY_THRESHOLD } from "@/lib/similarity";
import { executeCode } from "@/lib/judge/executor";

// POST /api/submissions
// Body: { challengeId, language, code }
// Runs code against all test cases via the standalone judge executor. Records submission.
// Awards XP idempotently. Updates streak. Triggers achievements + plagiarism check.
export async function POST(req: NextRequest) {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  if (session.role !== "student") return forbidden("Students only");

  let body: { challengeId?: string; language?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const { challengeId, language, code } = body;
  if (!challengeId || !language || !code) return fail("challengeId, language and code are required");
  const lang = language.toLowerCase();
  if (!["python", "py", "javascript", "js", "cpp", "c++", "c", "java"].includes(lang)) {
    return fail("Unsupported language");
  }
  if (code.length > 200000) return fail("Code too large");

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { testCases: { orderBy: { order: "asc" } } },
  });
  if (!challenge || challenge.status !== "published") return notFound("Challenge not found");
  const supportedLangs = safeJson<string[]>(challenge.languages, []);
  const langKey =
    lang === "py" ? "python" :
    lang === "js" ? "javascript" :
    lang === "c++" ? "cpp" :
    lang;

  if (supportedLangs.length > 0 && !supportedLangs.includes(langKey)) {
    return fail("This language is not supported for this challenge.");
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return unauthorized("User not found");
  if (user.isBanned) return forbidden("Account suspended");

  // rate limit: max 12 submissions / minute per user
  const oneMinAgo = new Date(Date.now() - 60_000);
  const recent = await db.submission.count({
    where: { userId: user.id, createdAt: { gte: oneMinAgo } },
  });
  if (recent >= 12) {
    return fail("Too many submissions. Please wait a moment and try again.", 429);
  }

  // determine attempt number for this (user,challenge)
  const priorCount = await db.submission.count({
    where: { userId: user.id, challengeId: challenge.id },
  });
  const attemptNumber = priorCount + 1;

  // has user already solved this challenge before?
  const alreadySolved = await db.submission.findFirst({
    where: { userId: user.id, challengeId: challenge.id, passedAll: true },
    select: { id: true },
  });
  const hadSolvedBefore = !!alreadySolved;

  // run each test case
  const timeLimitMs = challenge.timeLimitMs || 2000;
  const memoryLimitMb = challenge.memoryLimitMb || 256;
  const results: any[] = [];
  let passedCount = 0;
  let worstStatus: string = "Accepted";
  let totalExecMs = 0;
  let worstStderr = "";

  for (const tc of challenge.testCases) {
    const r = await executeCode(langKey, code, tc.input, tc.expectedOutput, timeLimitMs, memoryLimitMb);
    results.push({
      name: tc.name,
      isHidden: tc.isHidden,
      status: r.status,
      passed: r.passed,
      execTimeMs: r.execTimeMs,
      stdout: tc.isHidden && !r.passed ? "" : r.stdout,
      stderr: tc.isHidden && !r.passed ? "" : (r.stderr || "").slice(0, 1500),
      expected: tc.isHidden ? undefined : tc.expectedOutput,
      message: tc.isHidden && !r.passed ? "Hidden test case failed." : r.message,
    });
    if (r.passed) {
      passedCount++;
    } else {
      // Pick the most severe failure status
      if (r.status === "Internal Error" && worstStatus !== "Internal Error") {
        worstStatus = "Internal Error";
      } else if (r.status === "Compilation Error" && worstStatus !== "Internal Error") {
        worstStatus = "Compilation Error";
      } else if (r.status === "Runtime Error" && worstStatus !== "Internal Error" && worstStatus !== "Compilation Error") {
        worstStatus = "Runtime Error";
      } else if (r.status === "Time Limit Exceeded" && worstStatus === "Accepted") {
        worstStatus = "Time Limit Exceeded";
      } else if (r.status === "Memory Limit Exceeded" && worstStatus === "Accepted") {
        worstStatus = "Memory Limit Exceeded";
      } else if (r.status === "Wrong Answer" && worstStatus === "Accepted") {
        worstStatus = "Wrong Answer";
      } else if (worstStatus === "Accepted") {
        worstStatus = r.status || "Wrong Answer";
      }
      if (r.stderr && !worstStderr) worstStderr = r.stderr;
    }
    totalExecMs = Math.max(totalExecMs, r.execTimeMs);
  }

  const totalTests = challenge.testCases.length;
  const passedAll = passedCount === totalTests && totalTests > 0 && worstStatus === "Accepted";
  const finalStatus = passedAll ? "Accepted" : (worstStatus === "Accepted" ? "Wrong Answer" : worstStatus);
  const firstAttempt = attemptNumber === 1 && passedAll;

  // compute fingerprint for similarity bucketing
  const fp = fingerprint(code);

  // store submission
  const submission = await db.submission.create({
    data: {
      userId: user.id,
      challengeId: challenge.id,
      language: langKey,
      code,
      status: finalStatus,
      passedAll,
      passedCount,
      totalTests,
      attemptNumber,
      execTimeMs: totalExecMs,
      execMemoryKb: 0,
      isFinal: false,
      runtimeDetail: JSON.stringify(results),
      fingerprint: fp,
      firstAttempt,
      xpAwarded: 0,
    },
  });

  // award XP idempotently: only the FIRST successful solve earns primary XP.
  let xpAwarded = 0;
  let xpBreakdown: any = null;
  let newlySolved = false;
  if (passedAll && !hadSolvedBefore) {
    newlySolved = true;
    const baseReward = challenge.xpReward || 10;
    const streakBonus = user.currentStreak >= 3 ? 5 : 0;
    const firstAttemptBonus = firstAttempt ? 5 : 0;
    xpAwarded = baseReward + streakBonus + firstAttemptBonus;
    xpBreakdown = {
      base: baseReward,
      streak: streakBonus,
      firstAttempt: firstAttemptBonus,
      total: xpAwarded,
    };

    const newXp = user.xp + xpAwarded;
    await db.user.update({
      where: { id: user.id },
      data: {
        xp: newXp,
      },
    });

    await db.submission.update({
      where: { id: submission.id },
      data: { isFinal: true, xpAwarded },
    });

    await db.xpTransaction.create({
      data: {
        userId: user.id,
        amount: xpAwarded,
        reason: "challenge_solve",
        refId: challenge.id,
        description: `Solved "${challenge.title}"`,
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        type: "solve",
        description: `Solved "${challenge.title}" (+${xpAwarded} XP)`,
        refId: challenge.id,
        date: new Date().toISOString().slice(0, 10),
      },
    });
  } else {
    await db.activityLog.create({
      data: {
        userId: user.id,
        type: "submission",
        description: `Submitted code for "${challenge.title}" (${finalStatus})`,
        refId: submission.id,
        date: new Date().toISOString().slice(0, 10),
      },
    });
  }

  // update streaks
  if (passedAll) {
    await recomputeStreak(user.id);
  }

  // evaluate achievements & certificates
  const unlockedAchievements = await evaluateAchievements(user.id, {
    submissionId: submission.id,
    passedAll,
    language: langKey,
    firstAttempt,
    hadSolvedBefore,
  });

  const newCertificates = await evaluateCertificates(user.id);

  // check if user leveled up
  const updatedUser = await db.user.findUnique({ where: { id: user.id } });
  const leveledUp = updatedUser && updatedUser.level > user.level;
  const levelInfo = updatedUser ? { level: updatedUser.level, levelName: updatedUser.levelName, xp: updatedUser.xp } : null;

  // similarity check in background
  try {
    const others = await db.submission.findMany({
      where: {
        challengeId: challenge.id,
        language: langKey,
        passedAll: true,
        userId: { not: user.id },
      },
      select: { id: true, code: true, userId: true },
      take: 20,
    });
    for (const o of others) {
      const { score, method, reason } = compareCode(code, o.code);
      if (score >= SIMILARITY_THRESHOLD) {
        const existing = await db.plagiarismFlag.findFirst({
          where: {
            OR: [
              { submissionAId: submission.id, submissionBId: o.id },
              { submissionAId: o.id, submissionBId: submission.id },
            ],
          },
        });
        if (!existing) {
          await db.plagiarismFlag.create({
            data: {
              submissionAId: submission.id,
              submissionBId: o.id,
              similarity: score,
              method,
              reason,
            },
          });
        }
      }
    }
  } catch (e) {
    console.error("similarity error", e);
  }

  return ok({
    submission: {
      id: submission.id,
      status: finalStatus,
      passedAll,
      passedCount,
      totalTests,
      attemptNumber,
      execTimeMs: totalExecMs,
      xpAwarded,
      xpBreakdown,
      firstAttempt,
    },
    results: results,
    newlySolved,
    leveledUp,
    levelInfo,
    unlockedAchievements,
    newCertificates,
    nextAttemptNumber: attemptNumber + 1,
  });
}

// GET /api/submissions?challengeId=... — current user's submission history for a challenge
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  const url = new URL(req.url);
  const challengeId = url.searchParams.get("challengeId");
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const where: any = { userId: session.userId };
  if (challengeId) where.challengeId = challengeId;
  const subs = await db.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { challenge: { select: { id: true, title: true, slug: true, difficulty: true, category: true, xpReward: true } } },
  });
  return ok({ submissions: subs });
}
