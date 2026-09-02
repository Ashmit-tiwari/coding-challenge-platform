import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, unauthorized, notFound, safeJson } from "@/lib/api";

// GET /api/admin/submissions/[id] — full submission with code
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const { id } = await ctx.params;
  const sub = await db.submission.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, uid: true, name: true, year: true, batch: true, avatar: true } },
      challenge: { select: { id: true, title: true, slug: true, difficulty: true, category: true, xpReward: true } },
    },
  });
  if (!sub) return notFound("Submission not found");
  await writeAudit(admin.id, "view_submission", id, { user: sub.user.uid, challenge: sub.challenge.slug });
  return ok({
    submission: {
      id: sub.id,
      code: sub.code,
      language: sub.language,
      status: sub.status,
      passedAll: sub.passedAll,
      passedCount: sub.passedCount,
      totalTests: sub.totalTests,
      attemptNumber: sub.attemptNumber,
      execTimeMs: sub.execTimeMs,
      isFinal: sub.isFinal,
      firstAttempt: sub.firstAttempt,
      xpAwarded: sub.xpAwarded,
      fingerprint: sub.fingerprint,
      tabSwitchesCount: sub.tabSwitchesCount ?? 0,
      pasteCount: sub.pasteCount ?? 0,
      totalPastedLines: sub.totalPastedLines ?? 0,
      pastedLines: safeJson<number[]>(sub.pastedLines, []),
      integrityMetadata: safeJson(sub.integrityMetadata, null),
      runtimeDetail: safeJson(sub.runtimeDetail, []),
      createdAt: sub.createdAt,
      user: sub.user,
      challenge: sub.challenge,
    },
  });
}
