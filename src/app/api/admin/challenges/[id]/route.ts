import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, fail, unauthorized, notFound, publicChallenge } from "@/lib/api";

// GET /api/admin/challenges/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const { id } = await ctx.params;
  const ch = await db.challenge.findUnique({
    where: { id },
    include: { testCases: { orderBy: { order: "asc" } }, _count: { select: { submissions: true } } },
  });
  if (!ch) return notFound("Challenge not found");
  return ok({
    challenge: { ...publicChallenge(ch), solutionRef: ch.solutionRef, createdBy: ch.createdBy },
    testCases: ch.testCases,
    submissionsCount: ch._count.submissions,
  });
}

// PATCH /api/admin/challenges/[id] — update fields
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const { id } = await ctx.params;
  const existing = await db.challenge.findUnique({ where: { id } });
  if (!existing) return notFound("Challenge not found");
  let body: any;
  try { body = await req.json(); } catch { return fail("Invalid JSON"); }
  const data: any = {};
  const allowed: string[] = [
    "title","statement","description","difficulty","category","topic","xpReward",
    "targetYear","isWeekly","weekLabel","timeLimitMs","memoryLimitMb","constraints",
    "inputFormat","outputFormat","status","solutionRef","version",
  ];
  for (const k of allowed) {
    if (body[k] !== undefined) {
      if (k === "languages") data.languages = JSON.stringify(body.languages);
      else if (k === "examples") data.examples = JSON.stringify(body.examples);
      else if (k === "starterCode") data.starterCode = JSON.stringify(body.starterCode);
      else data[k] = body[k];
    }
  }
  // support languages/examples/starterCode directly
  if (body.languages !== undefined) data.languages = JSON.stringify(body.languages);
  if (body.examples !== undefined) data.examples = JSON.stringify(body.examples);
  if (body.starterCode !== undefined) data.starterCode = JSON.stringify(body.starterCode);

  const updated = await db.challenge.update({ where: { id }, data });
  // update test cases if provided
  if (Array.isArray(body.testCases)) {
    await db.testCase.deleteMany({ where: { challengeId: id } });
    for (let i = 0; i < body.testCases.length; i++) {
      const tc = body.testCases[i];
      await db.testCase.create({
        data: {
          challengeId: id,
          name: tc.name || `Test ${i + 1}`,
          input: tc.input || "",
          expectedOutput: tc.expectedOutput || "",
          isHidden: tc.isHidden ?? true,
          isSample: tc.isSample ?? false,
          scoreWeight: tc.scoreWeight || 1,
          order: i,
        },
      });
    }
  }
  await writeAudit(admin.id, "challenge_edit", id, { title: data.title || existing.title, status: data.status });
  return ok({ challenge: updated });
}

// DELETE /api/admin/challenges/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const { id } = await ctx.params;
  const existing = await db.challenge.findUnique({ where: { id } });
  if (!existing) return notFound("Challenge not found");
  await db.challenge.delete({ where: { id } });
  await writeAudit(admin.id, "challenge_delete", id, { slug: existing.slug, title: existing.title });
  return ok({ ok: true });
}
