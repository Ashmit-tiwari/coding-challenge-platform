import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, publicChallenge, safeJson } from "@/lib/api";

// GET /api/challenges — Fast Parallelized Query
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  const url = new URL(req.url);
  const difficulty = url.searchParams.get("difficulty");
  const category = url.searchParams.get("category");
  const year = url.searchParams.get("year");
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

  // Run challenge search and student submissions in parallel
  const [challenges, subs] = await Promise.all([
    db.challenge.findMany({
      where,
      orderBy: [{ isWeekly: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { submissions: true, testCases: true } } },
    }),
    session
      ? db.submission.findMany({
          where: { userId: session.userId },
          select: { challengeId: true, passedAll: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  let solvedIds = new Set<string>();
  let attemptedIds = new Set<string>();
  let userSubs: Record<string, any> = {};

  if (session && subs.length > 0) {
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

  return ok({
    challenges: challenges.map((c) => ({
      ...publicChallenge(c),
      testCasesCount: c._count.testCases,
      submissionsCount: c._count.submissions,
      userState: session ? (userSubs[c.id] || { solved: false, attempted: false, attempts: 0 }) : null,
    })),
  });
}
