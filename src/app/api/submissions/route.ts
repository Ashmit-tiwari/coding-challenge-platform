import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, fail, unauthorized, forbidden, notFound, publicChallenge, safeJson } from "@/lib/api";
import { evaluateAchievements, evaluateCertificates } from "@/lib/achievements";
import { recomputeStreak } from "@/lib/progression";
import { fingerprint, compareCode, SIMILARITY_THRESHOLD } from "@/lib/similarity";

const EXEC_URL = process.env.EXEC_SERVICE_URL || "http://localhost:3031";
const EXEC_PORT = process.env.EXEC_SERVICE_PORT || "3031";

// POST /api/submissions
// Body: { challengeId, language, code }
// Runs code against all test cases via the exec mini-service. Records submission.
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
  if (!["python", "py", "javascript", "js", "cpp", "c++"].includes(lang)) {
    return fail("Unsupported language");
  }
  if (code.length > 200000) return fail("Code too large");

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { testCases: { orderBy: { order: "asc" } } },
  });
  if (!challenge || challenge.status !== "published") return notFound("Challenge not found");
  const supportedLangs = safeJson<string[]>(challenge.languages, []);
  const langKey = lang === "py" ? "python" : lang === "js" ? "javascript" : lang === "c++" ? "cpp" : lang;
  if (supportedLangs.length > 0 && !supportedLangs.includes(langKey)) {
    return fail("This language is not supported for this challenge.");
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return unauthorized("User not found");
  if (user.isBanned) return forbidden("Account suspended");

  // rate limit: max 8 submissions / minute per user
  const oneMinAgo = new Date(Date.now() - 60_000);
  const recent = await db.submission.count({
    where: { userId: user.id, createdAt: { gte: oneMinAgo } },
  });
  if (recent >= 8) {
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
  const timeLimitMs = challenge.timeLimitMs;
  const memoryLimitMb = challenge.memoryLimitMb;
  const results: any[] = [];
  let passedCount = 0;
  let worstStatus: string = "Accepted";
  let totalExecMs = 0;
  let worstStderr = "";

  for (const tc of challenge.testCases) {
    const r = await runOneTest(langKey, code, tc.input, tc.expectedOutput, timeLimitMs, memoryLimitMb);
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
    if (r.passed) passedCount++;
    else {
      // pick the worst status (Compile Error trumps others)
      if (r.status === "Compilation Error") worstStatus = "Compilation Error";
      else if (r.status === "Runtime Error" && worstStatus !== "Compilation Error") worstStatus = "Runtime Error";
      else if (r.status === "Time Limit Exceeded" && worstStatus === "Accepted") worstStatus = "Time Limit Exceeded";
      else if (r.status === "Wrong Answer" && worstStatus === "Accepted") worstStatus = "Wrong Answer";
      if (r.stderr && !worstStderr) worstStderr = r.stderr;
    }
    totalExecMs = Math.max(totalExecMs, r.execTimeMs);
  }

  const totalTests = challenge.testCases.length;
  const passedAll = passedCount === totalTests && totalTests > 0;
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
      status: passedAll ? "Accepted" : worstStatus,
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
  // bonus for first-attempt success.
  let xpAwarded = 0;
  let xpBreakdown: any = null;
  let newlySolved = false;
  if (passedAll && !hadSolvedBefore) {
    newlySolved = true;
    const baseXp = challenge.xpReward;
    let bonus = 0;
    if (firstAttempt) {
      bonus = Math.round(baseXp * 0.25);
    }
    xpAwarded = baseXp + bonus;
    await db.xpTransaction.create({
      data: {
        userId: user.id,
        amount: xpAwarded,
        reason: "challenge_solve",
        refId: challenge.id,
      },
    });
    await db.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: xpAwarded },
      },
    });
    await db.submission.update({ where: { id: submission.id }, data: { xpAwarded } });
    xpBreakdown = { base: baseXp, firstAttemptBonus: bonus, total: xpAwarded };

    // mark this as the final successful submission for this user/challenge (clear previous finals)
    await db.submission.updateMany({
      where: { userId: user.id, challengeId: challenge.id, id: { not: submission.id } },
      data: { isFinal: false },
    });
    await db.submission.update({ where: { id: submission.id }, data: { isFinal: true } });

    // streak: activity log entry (date-based)
    const dateStr = new Date().toISOString().slice(0, 10);
    await db.activityLog.create({
      data: {
        userId: user.id,
        type: "solve",
        description: `Solved "${challenge.title}" (+${xpAwarded} XP)`,
        refId: challenge.id,
        date: dateStr,
      },
    });
    await db.activityLog.create({
      data: {
        userId: user.id,
        type: "submission",
        description: `Submitted "${challenge.title}" — ${passedAll ? "Accepted" : worstStatus}`,
        refId: submission.id,
        date: dateStr,
      },
    });
    const streak = await recomputeStreak(user.id);
    await db.user.update({
      where: { id: user.id },
      data: {
        currentStreak: streak.currentStreak,
        longestStreak: Math.max(streak.longestStreak, user.longestStreak),
        lastActiveDate: streak.lastActiveDate || null,
      },
    });
    // streak milestone notifications
    if ([7, 30].includes(streak.currentStreak)) {
      await db.notification.create({
        data: {
          userId: user.id,
          type: "streak",
          title: `${streak.currentStreak}-Day Streak!`,
          message: `Incredible consistency — you're on a ${streak.currentStreak}-day streak. Keep it alive!`,
          link: "/dashboard",
        },
      });
    }
  } else {
    // still log an attempt as activity
    const dateStr = new Date().toISOString().slice(0, 10);
    await db.activityLog.create({
      data: {
        userId: user.id,
        type: "submission",
        description: `Submitted "${challenge.title}" — ${passedAll ? "Accepted" : worstStatus}`,
        refId: submission.id,
        date: dateStr,
      },
    });
  }

  // recompute level/tier from new XP
  const updatedUser = await db.user.findUnique({ where: { id: user.id } });
  const { computeLevelInfo } = await import("@/lib/progression");
  const levelInfo = updatedUser ? computeLevelInfo(updatedUser.xp) : null;
  let leveledUp = false;
  if (levelInfo && updatedUser) {
    if (updatedUser.level !== levelInfo.level || updatedUser.levelName !== levelInfo.tier) {
      leveledUp = true;
      const prevTier = updatedUser.levelName;
      await db.user.update({
        where: { id: user.id },
        data: { level: levelInfo.level, levelName: levelInfo.tier },
      });
      if (prevTier !== levelInfo.tier) {
        await db.notification.create({
          data: {
            userId: user.id,
            type: "announcement",
            title: `You reached ${levelInfo.tier} tier!`,
            message: `Congratulations on graduating to the ${levelInfo.tier} tier. New challenges await.`,
            link: "/profile",
          },
        });
        await db.activityLog.create({
          data: {
            userId: user.id,
            type: "level_up",
            description: `Reached ${levelInfo.tier} tier (level ${levelInfo.level})`,
            date: new Date().toISOString().slice(0, 10),
          },
        });
      }
    }
  }

  // evaluate achievements + certificates (idempotent)
  const unlockedAchievements = await evaluateAchievements(user.id);
  const newCertificates = await evaluateCertificates(user.id);

  // plagiarism check — compare against other submissions for same challenge with same fingerprint OR sample others
  // do this asynchronously-ish but still within request for correctness
  try {
    const others = await db.submission.findMany({
      where: {
        challengeId: challenge.id,
        userId: { not: user.id },
        id: { not: submission.id },
      },
      select: { id: true, userId: true, code: true, language: true, fingerprint: true, createdAt: true },
      take: 200,
    });
    for (const o of others) {
      // quick fingerprint bucket
      let score = 0;
      let method: "token_norm" | "whitespace_norm" | "identifier_norm" | "structural" = "token_norm";
      let reason = "";
      if (o.fingerprint && o.fingerprint === fp) {
        // identical normalized fingerprint — definitely compare deeply
        const cmp = compareCode(code, o.code);
        score = cmp.score;
        method = cmp.method;
        reason = cmp.reason;
      } else {
        // sample compare every 5th submission to keep it cheap
        if (Math.random() < 0.4) {
          const cmp = compareCode(code, o.code);
          score = cmp.score;
          method = cmp.method;
          reason = cmp.reason;
        }
      }
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
    // similarity failure should never block submission result
    console.error("similarity error", e);
  }

  return ok({
    submission: {
      id: submission.id,
      status: passedAll ? "Accepted" : worstStatus,
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

// helper: run one test case via the exec mini-service
async function runOneTest(
  langKey: string,
  code: string,
  stdin: string,
  expected: string,
  timeLimitMs: number,
  memoryLimitMb: number,
): Promise<{ status: string; passed: boolean; stdout: string; stderr: string; execTimeMs: number; message?: string }> {
  try {
    const res = await fetch(`${EXEC_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langKey,
        code,
        stdin,
        expected,
        timeLimitMs,
        memoryLimitMb,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { status: "Internal Error", passed: false, stdout: "", stderr: txt.slice(0, 500), execTimeMs: 0, message: "Execution service error." };
    }
    const data = await res.json();
    return {
      status: data.status,
      passed: data.passed,
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      execTimeMs: data.execTimeMs || 0,
      message: data.message,
    };
  } catch (e: any) {
    return { status: "Internal Error", passed: false, stdout: "", stderr: String(e?.message || e).slice(0, 500), execTimeMs: 0, message: "Execution service unavailable." };
  }
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
