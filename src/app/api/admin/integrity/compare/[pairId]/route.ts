import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ok, unauthorized, notFound } from "@/lib/api";
import { compareCode } from "@/lib/similarity";

// GET /api/admin/integrity/compare/[pairId] — full side-by-side comparison
// pairId is the PlagiarismFlag id
export async function GET(_req: NextRequest, ctx: { params: Promise<{ pairId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const { pairId } = await ctx.params;
  const flag = await db.plagiarismFlag.findUnique({
    where: { id: pairId },
    include: {
      submissionA: { include: { user: true, challenge: true } },
      submissionB: { include: { user: true, challenge: true } },
    },
  });
  if (!flag) return notFound("Flag not found");
  // re-run live similarity for display
  const live = compareCode(flag.submissionA.code, flag.submissionB.code);
  return ok({
    flag: {
      id: flag.id,
      similarity: flag.similarity,
      method: flag.method,
      reason: flag.reason,
      status: flag.status,
      adminNote: flag.adminNote,
      createdAt: flag.createdAt,
    },
    live: live,
    a: {
      submissionId: flag.submissionA.id,
      user: flag.submissionA.user,
      challenge: flag.submissionA.challenge,
      language: flag.submissionA.language,
      attemptNumber: flag.submissionA.attemptNumber,
      status: flag.submissionA.status,
      code: flag.submissionA.code,
      createdAt: flag.submissionA.createdAt,
    },
    b: {
      submissionId: flag.submissionB.id,
      user: flag.submissionB.user,
      challenge: flag.submissionB.challenge,
      language: flag.submissionB.language,
      attemptNumber: flag.submissionB.attemptNumber,
      status: flag.submissionB.status,
      code: flag.submissionB.code,
      createdAt: flag.submissionB.createdAt,
    },
  });
}
