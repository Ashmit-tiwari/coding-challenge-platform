import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ok, unauthorized } from "@/lib/api";

// GET /api/admin/integrity?status=pending|reviewed|confirmed|dismissed&method=&minScore=
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const minScore = url.searchParams.get("minScore");
  const where: any = {};
  if (status) where.status = status;
  if (minScore) where.similarity = { gte: Number(minScore) };
  const flags = await db.plagiarismFlag.findMany({
    where,
    orderBy: [{ similarity: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      submissionA: { include: { user: { select: { uid: true, name: true, year: true } }, challenge: { select: { title: true, slug: true } } } },
      submissionB: { include: { user: { select: { uid: true, name: true, year: true } }, challenge: { select: { title: true, slug: true } } } },
      reviewer: { select: { username: true } },
    },
  });
  return ok({
    flags: flags.map((f) => ({
      id: f.id,
      similarity: f.similarity,
      method: f.method,
      reason: f.reason,
      status: f.status,
      adminNote: f.adminNote,
      reviewer: f.reviewer?.username || null,
      reviewedAt: f.reviewedAt,
      createdAt: f.createdAt,
      a: {
        submissionId: f.submissionA.id,
        user: f.submissionA.user,
        challenge: f.submissionA.challenge,
        language: f.submissionA.language,
        attemptNumber: f.submissionA.attemptNumber,
        createdAt: f.submissionA.createdAt,
        status: f.submissionA.status,
      },
      b: {
        submissionId: f.submissionB.id,
        user: f.submissionB.user,
        challenge: f.submissionB.challenge,
        language: f.submissionB.language,
        attemptNumber: f.submissionB.attemptNumber,
        createdAt: f.submissionB.createdAt,
        status: f.submissionB.status,
      },
    })),
  });
}
