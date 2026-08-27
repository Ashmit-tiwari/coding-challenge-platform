import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, notFound, publicChallenge, safeJson } from "@/lib/api";

// GET /api/challenges/[slug] — full challenge detail incl. sample test cases only
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const session = await getStudentSession();
  const challenge = await db.challenge.findUnique({
    where: { slug },
    include: { testCases: { orderBy: { order: "asc" } } },
  });
  if (!challenge) return notFound("Challenge not found");
  if (challenge.status !== "published") {
    return notFound("Challenge not available");
  }

  // students see only sample test cases; hidden test case metadata shows count only
  const visibleTests =
    session?.role === "student"
      ? challenge.testCases
          .filter((t) => t.isSample || !t.isHidden)
          .map((t) => ({
            id: t.id,
            name: t.name,
            input: t.input,
            expectedOutput: t.expectedOutput,
            isSample: t.isSample,
          }))
      : challenge.testCases.map((t) => ({
          id: t.id,
          name: t.name,
          input: t.input,
          expectedOutput: t.expectedOutput,
          isHidden: t.isHidden,
          isSample: t.isSample,
        }));

  const hiddenCount = challenge.testCases.filter((t) => t.isHidden).length;

  // user state
  let userState = null;
  if (session) {
    const subs = await db.submission.findMany({
      where: { userId: session.userId, challengeId: challenge.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        language: true,
        status: true,
        passedAll: true,
        attemptNumber: true,
        createdAt: true,
        execTimeMs: true,
      },
    });
    userState = {
      solved: subs.some((s) => s.passedAll),
      attempted: subs.length > 0,
      attempts: subs.length,
      submissions: subs,
    };
  }

  const pc = publicChallenge(challenge);
  return ok({
    challenge: pc,
    sampleTests: visibleTests,
    hiddenTestsCount: hiddenCount,
    userState,
  });
}
