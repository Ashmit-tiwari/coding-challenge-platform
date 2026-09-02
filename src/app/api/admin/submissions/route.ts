import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, unauthorized } from "@/lib/api";

// GET /api/admin/submissions?userId=&challengeId=&status=&language=&limit=50
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const challengeId = url.searchParams.get("challengeId");
  const status = url.searchParams.get("status");
  const language = url.searchParams.get("language");
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const where: any = {};
  if (userId) where.userId = userId;
  if (challengeId) where.challengeId = challengeId;
  if (status) where.status = status;
  if (language) where.language = language;
  const subs = await db.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { uid: true, name: true, year: true, avatar: true } },
      challenge: { select: { id: true, title: true, slug: true, difficulty: true, category: true } },
    },
  });
  return ok({
    submissions: subs.map((s) => ({
      id: s.id,
      user: s.user,
      challenge: s.challenge,
      language: s.language,
      status: s.status,
      passedAll: s.passedAll,
      passedCount: s.passedCount,
      totalTests: s.totalTests,
      attemptNumber: s.attemptNumber,
      execTimeMs: s.execTimeMs,
      xpAwarded: s.xpAwarded,
      isFinal: s.isFinal,
      fingerprint: s.fingerprint,
      tabSwitchesCount: s.tabSwitchesCount ?? 0,
      pasteCount: s.pasteCount ?? 0,
      totalPastedLines: s.totalPastedLines ?? 0,
      createdAt: s.createdAt,
    })),
  });
}
