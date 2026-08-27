import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";
import { evaluateAchievements, buildEvalContext } from "@/lib/achievements";

// GET /api/achievements?uid=... — all achievements + user's unlock state
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  const targetUid = uid || session?.uid;
  if (!targetUid) return unauthorized("Not logged in");

  const user = await db.user.findUnique({ where: { uid: targetUid } });
  if (!user) return ok({ achievements: [], unlocked: [], progress: null });

  const all = await db.achievement.findMany({ orderBy: [{ category: "asc" }, { rarity: "asc" }] });
  const unlockedRows = await db.userAchievement.findMany({
    where: { userId: user.id },
    include: { achievement: true },
  });
  const unlockedMap = new Map(unlockedRows.map((u) => [u.achievementId, u.unlockedAt]));

  let progress: Record<string, { current: number; needed: number; metric: string }> | null = null;
  if (session?.userId === user.id) {
    // compute live progress for each achievement (for the student's own view)
    const ctx = await buildEvalContext(user.id);
    progress = {};
    for (const a of all) {
      let cond: any;
      try { cond = JSON.parse(a.condition); } catch { continue; }
      let current = 0, needed = 0;
      switch (cond.metric) {
        case "solved_count": current = ctx.solvedCount; needed = Number(cond.value); break;
        case "streak_days": current = ctx.currentStreak; needed = Number(cond.value); break;
        case "longest_streak_days": current = ctx.longestStreak; needed = Number(cond.value); break;
        case "submission_count": current = ctx.submissionCount; needed = Number(cond.value); break;
        case "first_attempt_solve": current = ctx.firstAttemptSolves; needed = Number(cond.value); break;
        case "perfect_submission": current = ctx.perfectSubmissions; needed = Number(cond.value); break;
        case "zero_warnings_solve": current = ctx.zeroWarningSolves; needed = Number(cond.value); break;
        case "debugging_master": current = ctx.debugMasterCount; needed = Number(cond.value); break;
        case "test_crusher": current = ctx.testCrusherCount; needed = Number(cond.value); break;
        case "consistency_king": current = ctx.consistencyWeeks; needed = Number(cond.value); break;
        case "category_complete": current = ctx.categoryCounts[cond.category] || 0; needed = Number(cond.value); break;
        case "difficulty_solved": current = ctx.difficultyCounts[cond.difficulty] || 0; needed = Number(cond.value); break;
        case "tier_reached": {
          const order = ["Beginner", "Intermediate", "Advanced", "Pro"];
          current = order.indexOf(ctx.tier); needed = order.indexOf(String(cond.value)); break;
        }
        case "speed_ms": current = ctx.fastestSolveMs; needed = Number(cond.value); break;
        case "first_solve": current = ctx.hasFirstSolve ? 1 : 0; needed = 1; break;
        case "first_code_right": current = ctx.hasFirstCodeRight ? 1 : 0; needed = 1; break;
        default: current = 0; needed = 0;
      }
      progress[a.key] = { current, needed, metric: cond.metric };
    }
  }

  const out = all.map((a) => ({
    id: a.id,
    key: a.key,
    name: a.name,
    description: a.description,
    rarity: a.rarity,
    icon: a.icon,
    category: a.category,
    xpReward: a.xpReward,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) || null,
  }));

  return ok({
    achievements: out,
    progress,
    stats: {
      total: all.length,
      unlocked: unlockedRows.length,
    },
  });
}

// POST /api/achievements/evaluate — manually trigger evaluation (student can request a re-check)
export async function POST() {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  const unlocked = await evaluateAchievements(session.userId);
  return ok({ unlocked });
}
