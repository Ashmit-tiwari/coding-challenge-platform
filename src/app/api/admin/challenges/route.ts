import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, fail, unauthorized, publicChallenge, safeJson } from "@/lib/api";

// GET /api/admin/challenges?status=all|draft|published|archived
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where: any = {};
  if (status && status !== "all") where.status = status;
  const challenges = await db.challenge.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: { _count: { select: { submissions: true, testCases: true } } },
  });
  return ok({ challenges: challenges.map((c) => ({ ...publicChallenge(c), testCasesCount: c._count.testCases, submissionsCount: c._count.submissions })) });
}

// POST /api/admin/challenges — create a challenge
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  let body: any;
  try { body = await req.json(); } catch { return fail("Invalid JSON"); }
  const {
    slug, title, statement, description, difficulty, category, topic,
    xpReward, targetYear, isWeekly, weekLabel, timeLimitMs, memoryLimitMb,
    languages, constraints, examples, inputFormat, outputFormat, starterCode,
    status, testCases,
  } = body || {};

  if (!slug || !title || !statement || !difficulty || !category) {
    return fail("slug, title, statement, difficulty, category are required");
  }
  const existing = await db.challenge.findUnique({ where: { slug } });
  if (existing) return fail("A challenge with this slug already exists", 409);

  const ch = await db.challenge.create({
    data: {
      slug,
      title,
      statement,
      description: description || null,
      difficulty,
      category,
      topic: topic || null,
      xpReward: Number(xpReward) || 10,
      targetYear: targetYear || null,
      isWeekly: !!isWeekly,
      weekLabel: weekLabel || null,
      weekStartsAt: isWeekly ? new Date() : null,
      weekEndsAt: isWeekly ? new Date(Date.now() + 7 * 86400000) : null,
      timeLimitMs: Number(timeLimitMs) || 2000,
      memoryLimitMb: Number(memoryLimitMb) || 256,
      languages: JSON.stringify(languages || ["python", "cpp", "javascript"]),
      constraints: constraints || null,
      examples: JSON.stringify(examples || []),
      inputFormat: inputFormat || null,
      outputFormat: outputFormat || null,
      starterCode: JSON.stringify(starterCode || {}),
      status: status || "draft",
      createdBy: admin.id,
      testCases: {
        create: (testCases || []).map((tc: any, i: number) => ({
          name: tc.name || `Test ${i + 1}`,
          input: tc.input || "",
          expectedOutput: tc.expectedOutput || "",
          isHidden: tc.isHidden ?? true,
          isSample: tc.isSample ?? false,
          scoreWeight: tc.scoreWeight || 1,
          order: i,
        })),
      },
    },
    include: { testCases: true },
  });
  await writeAudit(admin.id, "challenge_create", ch.id, { slug, title });
  return ok({ challenge: ch });
}
