import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, publicChallenge, safeJson } from "@/lib/api";

// GET /api/challenges?difficulty=Easy&category=Python&year=1&status=published&q=sum&year1Only=true
// Returns published challenges only for students. Includes the student's solved state.
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  const url = new URL(req.url);
  const difficulty = url.searchParams.get("difficulty");
  const category = url.searchParams.get("category");
  const year = url.searchParams.get("year"); // "1" | "2"
  const status = url.searchParams.get("status") || "published";
  const q = url.searchParams.get("q")?.toLowerCase();
  const weeklyOnly = url.searchParams.get("weekly") === "true";

  const where: any = { status };
  if (difficulty) where.difficulty = difficulty;
  if (category) where.category = category;
  if (year) where.targetYear = year;
  if (weeklyOnly) where.isWeekly = true;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { category: { contains: q } },
      { topic: { contains: q } },
    ];
  }

  const challenges = await db.challenge.findMany({
    where,
    orderBy: [{ isWeekly: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { submissions: true, testCases: true } } },
  });

  // If student logged in, compute solved state per challenge
  let solvedIds = new Set<string>();
  let attemptedIds = new Set<string>();
  let userSubs: Record<string, any> = {};
  if (session) {
    const subs = await db.submission.findMany({
      where: { userId: session.userId },
      select: { challengeId: true, passedAll: true, createdAt: true },
    });
    for (const s of subs) {
      attemptedIds.add(s.challengeId);
      if (s.passedAll) solvedIds.add(s.challengeId);
    }
    for (const c of challenges) {
      const cs = subs.filter((s) => s.challengeId === c.id);
      userSubs[c.id] = {
        solved: solvedIds.has(c.id),
        attempted: attemptedIds.has(c.id),
        attempts: cs.length,
      };
    }
  }

  const out = challenges.map((c) => {
    const pc = publicChallenge(c);
    return {
      ...pc,
      testCasesCount: c._count.testCases,
      submissionsCount: c._count.submissions,
      userState: userSubs[c.id] || null,
    };
  });

  return ok({ challenges: out, total: out.length });
}
